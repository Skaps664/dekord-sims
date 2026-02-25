export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET(request: NextRequest) {
  try {
    const summary = await DatabaseClient.getRecoverySummary()
    return NextResponse.json(createSuccessResponse(summary))
  } catch (error) {
    console.error("[v0] Recovery summary API error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
