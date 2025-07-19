import { db } from "@/server/db";
import { checkJulesComments, processWorkflowDecision } from "@/lib/jules";

export async function executeCommentCheck(
  owner: string,
  repo: string,
  issueNumber: number,
  taskId: number,
): Promise<void> {
  console.log(
    `Executing enhanced comment check for ${owner}/${repo}#${issueNumber}`,
  );

  try {
    // Check if task still exists and is relevant
    const task = await db.julesTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      console.log(`Task ${taskId} no longer exists, skipping comment check`);
      return;
    }

    // Jules comment analysis with retry logic
    const commentResult = await checkJulesComments(
      owner,
      repo,
      issueNumber,
      3, // maxRetries
      0.6, // minConfidence
    );

    console.log(
      `Comment analysis result for ${owner}/${repo}#${issueNumber}:`,
      {
        action: commentResult.action,
        confidence: commentResult.analysis?.confidence,
        retryCount: commentResult.retryCount,
        patterns: commentResult.analysis?.patterns_matched,
      },
    );

    // Process the workflow decision using the enhanced system
    await processWorkflowDecision(
      owner,
      repo,
      issueNumber,
      taskId,
      commentResult,
    );

    // Log successful comment check
    await db.webhookLog.create({
      data: {
        eventType: "comment_check_success",
        payload: JSON.stringify({
          owner,
          repo,
          issueNumber,
          taskId,
          action: commentResult.action,
          confidence: commentResult.analysis?.confidence,
          retryCount: commentResult.retryCount,
        }),
        success: true,
      },
    });
  } catch (error) {
    console.error(
      `Error during comment check for ${owner}/${repo}#${issueNumber}:`,
      error,
    );

    // Log the error to the database
    try {
      await db.webhookLog.create({
        data: {
          eventType: "comment_check_error",
          payload: JSON.stringify({
            owner,
            repo,
            issueNumber,
            taskId,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (logError) {
      console.error("Failed to log comment check error:", logError);
    }
  }
}
