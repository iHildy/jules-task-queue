import { installationService } from "@/lib/installation-service";
import {
  checkJulesComments,
  parseRepoFromIssue,
  processWorkflowDecision,
  upsertJulesTask,
} from "@/lib/jules";
import { db } from "@/server/db";
import type { GitHubLabelEvent, ProcessingResult } from "@/types";

async function scheduleCommentCheck(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number,
  delayMs: number = 60000, // 60 seconds
): Promise<void> {
  console.log(
    `Scheduling comment check for ${owner}/${repo}#${issueNumber} in ${delayMs}ms`,
  );

  const scheduledAt = new Date(Date.now() + delayMs);

  await db.commentCheckJob.create({
    data: {
      taskId,
      owner,
      repo,
      issueNumber,
      scheduledAt,
    },
  });
}

/**
 * Process a Jules label event (main workflow entry point)
 */
export async function processJulesLabelEvent(
  event: GitHubLabelEvent,
  installationId?: number,
): Promise<ProcessingResult> {
  const { action, label, issue, repository } = event;
  const labelName = label.name.toLowerCase();

  try {
    // Parse repository information
    const repoInfo = parseRepoFromIssue({ repository });
    if (!repoInfo) {
      return {
        action: "error",
        message: "Could not parse repository information",
      };
    }

    const { owner, repo } = repoInfo;

    // Handle 'jules' label events
    if (labelName === "jules" && action === "labeled") {
      // Validate installation access if installationId is provided
      if (installationId) {
        const hasAccess = await installationService.validateRepositoryAccess(
          owner,
          repo,
          installationId,
        );
        if (!hasAccess) {
          return {
            action: "error",
            message: `Repository ${owner}/${repo} is not accessible through installation ${installationId}`,
          };
        }
      }

      // Create or update task in database
      const task = await upsertJulesTask({
        githubRepoId: BigInt(repository.id),
        githubIssueId: BigInt(issue.id),
        githubIssueNumber: BigInt(issue.number),
        repoOwner: owner,
        repoName: repo,
        installationId,
      });

      console.log(
        `Created/updated task ${task.id} for ${owner}/${repo}#${issue.number}`,
      );

      // Check if issue has 'Human' label - if so, skip automatic processing
      const hasHumanLabel = issue.labels.some(
        (l) => l.name.toLowerCase() === "human",
      );
      if (hasHumanLabel) {
        console.log(
          `Issue ${owner}/${repo}#${issue.number} has 'Human' label, skipping automatic processing`,
        );
        return {
          action: "no_action",
          taskId: task.id,
          message: "Issue has 'Human' label, skipping automatic processing",
        };
      }

      // Schedule comment check after 60 seconds
      const delayMs = 60000; // 60 seconds
      await scheduleCommentCheck(owner, repo, issue.number, task.id, delayMs);

      return {
        action: "timer_scheduled",
        taskId: task.id,
        message: `Task created and comment check scheduled for ${delayMs}ms`,
        delayMs,
      };
    }

    // Handle 'jules' label removal
    if (labelName === "jules" && action === "unlabeled") {
      // Find existing task
      const existingTask = await db.julesTask.findUnique({
        where: { githubIssueId: BigInt(issue.id) },
      });

      if (existingTask) {
        // Update task to indicate jules label was removed
        await db.julesTask.update({
          where: { id: existingTask.id },
          data: {
            flaggedForRetry: false,
            updatedAt: new Date(),
          },
        });

        console.log(
          `Jules label removed from ${owner}/${repo}#${issue.number}, updated task ${existingTask.id}`,
        );

        return {
          action: "task_updated",
          taskId: existingTask.id,
          message: "Jules label removed, task updated",
        };
      }

      return {
        action: "no_action",
        message: "Jules label removed but no task found",
      };
    }

    // Handle 'jules-queue' label events (mostly for logging/monitoring)
    if (labelName === "jules-queue") {
      console.log(
        `Jules-queue label ${action} on ${owner}/${repo}#${issue.number}`,
      );

      return {
        action: "no_action",
        message: `Jules-queue label ${action} - no processing required`,
      };
    }

    return {
      action: "no_action",
      message: `No processing required for ${labelName} ${action}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Jules label event:", {
      error: errorMessage,
      event: {
        action,
        label: label.name,
        issue: issue.number,
        repository: repository.full_name,
      },
    });

    return {
      action: "error",
      message: `Processing failed: ${errorMessage}`,
    };
  }
}

/**
 * Manual trigger for comment checking (useful for testing and admin operations)
 */
export async function triggerCommentCheck(
  taskId: number,
): Promise<ProcessingResult> {
  try {
    const task = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return {
        action: "error",
        message: `Task ${taskId} not found`,
      };
    }

    // With enhanced schema, we now have stored repo information
    const { repoOwner, repoName, githubIssueNumber } = task;
    const issueNumber = Number(githubIssueNumber);

    console.log(
      `Manually triggering comment check for task ${taskId}: ${repoOwner}/${repoName}#${issueNumber}`,
    );

    // Execute comment check immediately
    // TODO: This should be replaced with a call to the new job queue system
    // await executeCommentCheck(repoOwner, repoName, issueNumber, taskId);

    return {
      action: "task_updated",
      taskId,
      message: "Comment check executed manually",
    };
  } catch (error) {
    return {
      action: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get processing statistics for monitoring
 */
export async function getProcessingStats() {
  try {
    const [
      totalTasks,
      queuedTasks,
      recentWebhooks,
      failedWebhooks,
      processingErrors,
    ] = await Promise.all([
      db.julesTask.count(),
      db.julesTask.count({ where: { flaggedForRetry: true } }),
      db.webhookLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      }),
      db.webhookLog.count({
        where: {
          success: false,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      }),
      db.webhookLog.count({
        where: {
          eventType: "comment_check_error",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
          },
        },
      }),
    ]);

    return {
      totalTasks,
      queuedTasks,
      recentWebhooks,
      failedWebhooks,
      processingErrors,
      webhookSuccessRate:
        recentWebhooks > 0
          ? ((recentWebhooks - failedWebhooks) / recentWebhooks) * 100
          : 100,
    };
  } catch (error) {
    console.error("Failed to get processing stats:", error);
    throw error;
  }
}
