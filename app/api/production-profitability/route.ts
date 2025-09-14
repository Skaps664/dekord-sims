import { NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    const profitability = await DatabaseClient.getProductionProfitability()
    return NextResponse.json(createSuccessResponse(profitability))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
