import { NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    const [inventorySummary, distributionPerformance, productionProfitability, topProducts, financialSummary] =
      await Promise.all([
        DatabaseClient.getInventorySummary(),
        DatabaseClient.getDistributionPerformance(),
        DatabaseClient.getProductionProfitability(),
        DatabaseClient.getTopPerformingProducts(),
        DatabaseClient.getFinancialSummary(),
      ])

    const analytics = {
      inventory: inventorySummary,
      distributions: distributionPerformance,
      production: productionProfitability,
      topProducts,
      financial: financialSummary,
    }

    return NextResponse.json(createSuccessResponse(analytics))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
