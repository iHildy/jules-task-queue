import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { triggerCommentCheck } from "@/lib/webhook-processor";

export async function GET() {
  try {
    const dueTasks = await db.julesTask.findMany({
      where: {
        scheduledCheckTime: {
          lte: new Date(),
        },
        checkedAt: null,
      },
    });

    for (const task of dueTasks) {
      await triggerCommentCheck(task.id);
      await db.julesTask.update({
        where: { id: task.id },
        data: { checkedAt: new Date() },
      });
    }

    return NextResponse.json({
      message: `Checked ${dueTasks.length} tasks.`,
    });
  } catch (error) {
    console.error("Cron job for comment check failed:", error);
    return NextResponse.json(
      { error: "Cron job for comment check failed" },
      { status: 500 },
    );
  }
}
