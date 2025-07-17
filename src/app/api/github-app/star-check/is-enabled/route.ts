import { NextResponse } from "next/server";
import { isStarRequirementEnabled } from "@/lib/env";

export async function GET() {
  return NextResponse.json({ isEnabled: isStarRequirementEnabled() });
}
