export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    const performance = await DatabaseClient.getDistributionPerformance()
    return NextResponse.json(createSuccessResponse(performance))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
