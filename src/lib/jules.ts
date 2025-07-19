import { githubClient } from "@/lib/github";
import { db } from "@/server/db";
import type {
  CommentAnalysis,
  CommentClassification,
  GitHubComment,
  GitHubIssueData,
  TaskCreationParams,
} from "@/types";

/**
 * Jules username patterns to look for
 */
const JULES_BOT_USERNAMES = ["google-labs-jules[bot]", "google-labs-jules"];

/**
 * Comment patterns that indicate Jules has hit task limits
 */
const TASK_LIMIT_PATTERNS = ["You are currently at your concurrent task limit"];

/**
 * Comment patterns that indicate Jules has started working
 */
const WORKING_PATTERNS = ["When finished, you will see another comment"];

/**
 * Enhanced comment analysis with confidence scoring
 */
export function analyzeComment(comment: GitHubComment): CommentAnalysis {
  const body = comment.body?.toLowerCase() || "";
  const timestamp = new Date(comment.created_at);
  const age_minutes = (Date.now() - timestamp.getTime()) / (1000 * 60);

  let classification: CommentClassification = "unknown";
  let confidence = 0;
  let patterns_matched: string[] = [];

  // Check for task limit patterns
  const taskLimitMatches = TASK_LIMIT_PATTERNS.filter((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
  if (taskLimitMatches.length > 0) {
    classification = "task_limit";
    confidence = Math.min(1.0, taskLimitMatches.length * 0.4 + 0.4);
    patterns_matched = taskLimitMatches;
  }

  // Check for working patterns (higher confidence than task limit)
  const workingMatches = WORKING_PATTERNS.filter((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
  if (workingMatches.length > 0 && confidence < 0.8) {
    classification = "working";
    confidence = Math.min(1.0, workingMatches.length * 0.3 + 0.5);
    patterns_matched = workingMatches;
  }

  return {
    classification,
    confidence,
    comment,
    patterns_matched,
    timestamp,
    age_minutes,
  };
}

/**
 * Detect if a comment indicates Jules has hit task limits
 */
export function isTaskLimitComment(commentBody: string): boolean {
  const body = commentBody.toLowerCase();
  return TASK_LIMIT_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
}

/**
 * Detect if a comment indicates Jules is working
 */
export function isWorkingComment(commentBody: string): boolean {
  const body = commentBody.toLowerCase();
  return WORKING_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
}

/**
 * Check if a username is a Jules
 */
export function isJulesBot(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return JULES_BOT_USERNAMES.some((botName) =>
    lowerUsername.includes(botName.toLowerCase().replace("[bot]", "")),
  );
}

// GitHub types are now imported from @/types

/**
 * Parse repository information from GitHub issue data
 */
export function parseRepoFromIssue(
  issueData: GitHubIssueData,
): { owner: string; repo: string } | null {
  if (!issueData?.repository?.full_name) {
    return null;
  }

  const [owner, repo] = issueData.repository.full_name.split("/");
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Create or update a Jules task in the database
 */
export async function upsertJulesTask(params: TaskCreationParams) {
  const {
    githubRepoId,
    githubIssueId,
    githubIssueNumber,
    repoOwner,
    repoName,
    installationId,
  } = params;

  // Try to find existing task
  const existingTask = await db.julesTask.findUnique({
    where: { githubIssueId },
  });

  if (existingTask) {
    // Update existing task
    return await db.julesTask.update({
      where: { githubIssueId },
      data: {
        githubRepoId,
        githubIssueNumber,
        repoOwner,
        repoName,
        installationId,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new task
    return await db.julesTask.create({
      data: {
        githubRepoId,
        githubIssueId,
        githubIssueNumber,
        repoOwner,
        repoName,
        installationId,
        flaggedForRetry: false,
        retryCount: 0,
      },
    });
  }
}

/**
 * Check Jules comments on an issue and determine next action
 */
export async function checkJulesComments(
  owner: string,
  repo: string,
  issueNumber: number,
  maxRetries: number = 3,
  minConfidence: number = 0.6,
): Promise<{
  action: CommentClassification;
  comment?: GitHubComment;
  analysis?: CommentAnalysis;
  retryCount?: number;
}> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(
        `Checking Jules comments for ${owner}/${repo}#${issueNumber} (attempt ${
          attempt + 1
        }/${maxRetries})`,
      );

      // Get all comments on the issue
      const comments = await githubClient.getIssueComments(
        owner,
        repo,
        issueNumber,
      );

      // Filter for Jules comments (most recent first)
      const julesComments = comments
        .filter((comment) => comment.user && isJulesBot(comment.user.login))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      if (julesComments.length === 0) {
        console.log(
          `No Jules comments found for ${owner}/${repo}#${issueNumber}`,
        );
        return { action: "no_action", retryCount: attempt };
      }

      // Analyze the most recent Jules comment
      const latestComment = julesComments[0] as GitHubComment;
      const analysis = analyzeComment(latestComment);

      console.log(`Comment analysis for ${owner}/${repo}#${issueNumber}:`, {
        classification: analysis.classification,
        confidence: analysis.confidence,
        patterns: analysis.patterns_matched,
        age_minutes: analysis.age_minutes,
      });

      // Check if comment is too old (older than 2 hours might be stale)
      if (analysis.age_minutes > 120) {
        console.log(
          `Latest Jules comment is ${analysis.age_minutes} minutes old, treating as stale`,
        );
        return {
          action: "no_action",
          comment: latestComment,
          analysis,
          retryCount: attempt,
        };
      }

      // Apply confidence threshold
      if (analysis.confidence < minConfidence) {
        console.log(
          `Comment confidence ${analysis.confidence} below threshold ${minConfidence}, treating as uncertain`,
        );

        // For uncertain comments, check if we have multiple recent comments
        const recentComments = julesComments.filter(
          (comment) =>
            (Date.now() - new Date(comment.created_at).getTime()) /
              (1000 * 60) <
            30,
        );

        if (recentComments.length > 1) {
          // Analyze the second most recent comment for context
          const secondAnalysis = analyzeComment(
            recentComments[1] as GitHubComment,
          );
          if (secondAnalysis.confidence >= minConfidence) {
            console.log(
              `Using second comment with higher confidence: ${secondAnalysis.confidence}`,
            );
            return {
              action: secondAnalysis.classification,
              comment: recentComments[1] as GitHubComment,
              analysis: secondAnalysis,
              retryCount: attempt,
            };
          }
        }

        return {
          action: "unknown",
          comment: latestComment,
          analysis,
          retryCount: attempt,
        };
      }

      // Return successful analysis
      return {
        action: analysis.classification,
        comment: latestComment,
        analysis,
        retryCount: attempt,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Attempt ${attempt + 1} failed for ${owner}/${repo}#${issueNumber}:`,
        error,
      );

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error(
    `All ${maxRetries} attempts failed for ${owner}/${repo}#${issueNumber}:`,
    lastError,
  );

  return {
    action: "no_action",
    retryCount: maxRetries,
  };
}

/**
 * Handle task limit scenario - queue the task for retry
 */
export async function handleTaskLimit(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number,
  analysis?: CommentAnalysis,
): Promise<void> {
  try {
    console.log(
      `Handling task limit for ${owner}/${repo}#${issueNumber}, confidence: ${
        analysis?.confidence || "unknown"
      }`,
    );

    // Validate current state before making changes
    const currentTask = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!currentTask) {
      throw new Error(`Task ${taskId} not found in database`);
    }

    if (currentTask.flaggedForRetry) {
      console.log(`Task ${taskId} already flagged for retry, skipping`);
      return;
    }

    // Check if issue still has the jules label
    const issue = await githubClient.getIssue(owner, repo, issueNumber);
    const hasJulesLabel =
      issue.labels?.some(
        (label) =>
          (typeof label === "string" ? label : label.name)?.toLowerCase() ===
          "jules",
      ) ?? false;

    if (!hasJulesLabel) {
      console.log(
        `Issue ${owner}/${repo}#${issueNumber} no longer has 'jules' label, aborting task limit handling`,
      );
      return;
    }

    // Update task in database to be flagged for retry
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: true,
        updatedAt: new Date(),
      },
    });

    // Swap labels: remove 'jules', add 'jules-queue'
    await githubClient.swapLabels(
      owner,
      repo,
      issueNumber,
      "jules",
      "jules-queue",
    );

    // Add refresh emoji reaction to Jules' comment if analysis available
    if (analysis?.comment) {
      try {
        await githubClient.addReactionToComment(
          owner,
          repo,
          analysis.comment.id,
          "eyes",
        );
        console.log(
          `Added refresh emoji reaction to Jules comment for task limit`,
        );
      } catch (reactionError) {
        console.warn(`Failed to add refresh reaction: ${reactionError}`);
      }
    }

    console.log(
      `Successfully queued task for retry: ${owner}/${repo}#${issueNumber}`,
    );
  } catch (error) {
    console.error(
      `Failed to handle task limit for ${owner}/${repo}#${issueNumber}:`,
      error,
    );

    // Attempt to revert database changes if label swap failed
    try {
      await db.julesTask.update({
        where: { id: taskId },
        data: {
          flaggedForRetry: false,
          updatedAt: new Date(),
        },
      });
      console.log(`Reverted database changes for task ${taskId} after failure`);
    } catch (revertError) {
      console.error(
        `Failed to revert database changes for task ${taskId}:`,
        revertError,
      );
    }

    throw error;
  }
}

/**
 * Enhanced working handler with validation
 */
export async function handleWorking(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number,
  analysis?: CommentAnalysis,
): Promise<void> {
  try {
    console.log(
      `Handling working status for ${owner}/${repo}#${issueNumber}, confidence: ${
        analysis?.confidence || "unknown"
      }`,
    );

    // Validate current state
    const currentTask = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!currentTask) {
      throw new Error(`Task ${taskId} not found in database`);
    }

    // Update task in database to not be flagged for retry
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: false,
        updatedAt: new Date(),
      },
    });

    // Add thumbs up emoji reaction to Jules' comment if analysis available
    if (analysis?.comment) {
      try {
        await githubClient.addReactionToComment(
          owner,
          repo,
          analysis.comment.id,
          "+1",
        );
        console.log(
          `Added thumbs up emoji reaction to Jules comment for working status`,
        );
      } catch (reactionError) {
        console.warn(`Failed to add thumbs up reaction: ${reactionError}`);
      }
    }

    console.log(`Jules is working on: ${owner}/${repo}#${issueNumber}`);
  } catch (error) {
    console.error(
      `Failed to handle working status for ${owner}/${repo}#${issueNumber}:`,
      error,
    );
    throw error;
  }
}

/**
 * Enhanced workflow processor with comprehensive decision logic
 */
export async function processWorkflowDecision(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number,
  result: {
    action: CommentClassification;
    comment?: GitHubComment;
    analysis?: CommentAnalysis;
    retryCount?: number;
  },
): Promise<void> {
  const { action, analysis } = result;

  console.log(
    `Processing workflow decision for ${owner}/${repo}#${issueNumber}: ${action} (confidence: ${
      analysis?.confidence || "unknown"
    })`,
  );

  switch (action) {
    case "task_limit":
      await handleTaskLimit(owner, repo, issueNumber, taskId, analysis);
      break;

    case "working":
      await handleWorking(owner, repo, issueNumber, taskId, analysis);
      break;

    case "unknown":
      console.log(
        `Uncertain comment classification for ${owner}/${repo}#${issueNumber}, no action taken`,
      );
      // For unknown patterns, add warning reaction and quote reply
      if (result.comment) {
        try {
          await githubClient.addReactionToComment(
            owner,
            repo,
            result.comment.id,
            "confused",
          );
          const errorMsg = `⚠️ **Jules Task Queue**: Detected an unknown Jules response pattern. This may require manual review.`;
          await githubClient.createQuoteReply(
            owner,
            repo,
            issueNumber,
            result.comment.body || "Unknown comment",
            errorMsg,
            result.comment.user?.login,
          );
        } catch (reactionError) {
          console.warn(
            `Failed to add warning reaction/comment for ${owner}/${repo}#${issueNumber}:`,
            reactionError,
          );
        }
      }
      break;

    case "no_action":
    default:
      console.log(
        `No action needed for ${owner}/${repo}#${issueNumber}: ${action}`,
      );
      break;
  }
}

/**
 * Process retry for a flagged task (enhanced with stored repo info)
 */
export async function processTaskRetry(taskId: number): Promise<boolean> {
  try {
    const task = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.flaggedForRetry) {
      console.log(`Task ${taskId} not found or not flagged for retry`);
      return false;
    }

    const { repoOwner, repoName, githubIssueNumber } = task;
    const issueNumber = Number(githubIssueNumber);

    console.log(
      `Processing retry for task ${taskId}: ${repoOwner}/${repoName}#${issueNumber}`,
    );

    // Check if issue still has 'Human' label - if so, skip
    const issue = await githubClient.getIssue(repoOwner, repoName, issueNumber);
    const hasHumanLabel =
      issue.labels?.some(
        (label) =>
          (typeof label === "string" ? label : label.name)?.toLowerCase() ===
          "human",
      ) ?? false;

    if (hasHumanLabel) {
      console.log(`Task ${taskId} has 'Human' label, skipping retry`);
      return false;
    }

    // Check if the 'jules-queue' label is still present
    const hasQueueLabel =
      issue.labels?.some(
        (label) =>
          (typeof label === "string" ? label : label.name)?.toLowerCase() ===
          "jules-queue",
      ) ?? false;

    if (!hasQueueLabel) {
      console.log(
        `Task ${taskId} no longer has 'jules-queue' label, skipping retry as it might have been manually triggered or resolved`,
      );
      // Mark as not needing retry to prevent it from being picked up again
      await db.julesTask.update({
        where: { id: taskId },
        data: { flaggedForRetry: false, updatedAt: new Date() },
      });
      return false;
    }

    // Update retry metrics first to avoid race conditions
    await db.julesTask.update({
      where: { id: taskId },
      data: {
        flaggedForRetry: false,
        retryCount: task.retryCount + 1,
        lastRetryAt: new Date(),
      },
    });

    // Swap labels: remove 'jules-queue', add 'jules'
    await githubClient.swapLabels(
      repoOwner,
      repoName,
      issueNumber,
      "jules-queue",
      "jules",
    );

    console.log(
      `Successfully retried task ${taskId}: ${repoOwner}/${repoName}#${issueNumber}`,
    );
    return true;
  } catch (error) {
    console.error(`Failed to process retry for task ${taskId}:`, error);
    // If the error is critical, consider re-flagging the task or logging for manual review
    // For now, we assume the task is no longer flagged and will be handled by the next check if needed
    // Re-flagging could cause loops, so we'll be conservative
    return false;
  }
}

/**
 * Get all tasks flagged for retry
 */
export async function getFlaggedTasks() {
  return await db.julesTask.findMany({
    where: { flaggedForRetry: true },
    orderBy: { createdAt: "asc" }, // Process oldest first
  });
}

/**
 * Bulk retry all flagged tasks
 */
export async function retryAllFlaggedTasks(): Promise<{
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
}> {
  const flaggedTasks = await getFlaggedTasks();
  const stats = {
    attempted: flaggedTasks.length,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  for (const task of flaggedTasks) {
    try {
      const success = await processTaskRetry(task.id);
      if (success) {
        stats.successful++;
      } else {
        stats.skipped++;
      }
    } catch (error) {
      console.error(`Failed to retry task ${task.id}:`, error);
      stats.failed++;
    }
  }

  console.log(`Retry batch complete:`, stats);
  return stats;
}

/**
 * Clean up old completed tasks (housekeeping)
 */
export async function cleanupOldTasks(
  olderThanDays: number = 30,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db.julesTask.deleteMany({
    where: {
      flaggedForRetry: false,
      updatedAt: {
        lt: cutoffDate,
      },
    },
  });

  console.log(
    `Cleaned up ${result.count} old tasks older than ${olderThanDays} days`,
  );
  return result.count;
}

/**
 * Get task statistics for monitoring
 */
export async function getTaskStats() {
  const [totalTasks, queuedTasks, activeTasks, oldestQueuedTask, retryStats] =
    await Promise.all([
      db.julesTask.count(),
      db.julesTask.count({ where: { flaggedForRetry: true } }),
      db.julesTask.count({
        where: {
          flaggedForRetry: false,
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // last hour
          },
        },
      }),
      db.julesTask.findFirst({
        where: { flaggedForRetry: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      db.julesTask.aggregate({
        where: { flaggedForRetry: true },
        _avg: { retryCount: true },
        _max: { retryCount: true },
      }),
    ]);

  return {
    totalTasks,
    queuedTasks,
    activeTasks,
    oldestQueuedTaskAge: oldestQueuedTask
      ? Date.now() - oldestQueuedTask.createdAt.getTime()
      : null,
    averageRetryCount: retryStats._avg.retryCount || 0,
    maxRetryCount: retryStats._max.retryCount || 0,
  };
}
