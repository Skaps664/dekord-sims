import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    const finishedProducts = await DatabaseClient.getInventoryByType('finished_product')
    return NextResponse.json(createSuccessResponse(finishedProducts))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}