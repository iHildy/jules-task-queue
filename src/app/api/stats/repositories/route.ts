import { db } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const totalRepositories = await db.installationRepository.count({
      where: {
        removedAt: null, // only active repositories
      },
    });

    return NextResponse.json({ totalRepositories });
  } catch (error) {
    console.error("Failed to fetch repository stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
