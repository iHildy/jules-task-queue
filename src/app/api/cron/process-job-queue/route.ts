import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { executeCommentCheck } from '@/lib/comment-checker';

export async function GET() {
  try {
    const now = new Date();
    const jobs = await db.jobQueue.findMany({
      where: {
        runAt: {
          lte: now,
        },
      },
    });

    for (const job of jobs) {
      try {
        await executeCommentCheck(job.owner, job.repo, job.issueNumber, job.taskId);
        await db.jobQueue.delete({ where: { id: job.id } });
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        // Optionally, you could add some error handling here,
        // like moving the job to a dead-letter queue.
      }
    }

    return NextResponse.json({ success: true, processedJobs: jobs.length });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}
