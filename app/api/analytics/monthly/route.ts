import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Starting monthly analytics API call")
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    console.log("[v0] Fetching data from database...")

    let monthlyFinancial = []
    let rawMaterialUsage = []
    let inventorySummary = []
    let distributionPerformance = []
    let productionProfitability = []

    try {
      monthlyFinancial = await DatabaseClient.getMonthlyFinancialSummary()
    } catch (error) {
      console.error("[v0] Error fetching monthly financial:", error)
    }

    try {
      rawMaterialUsage = await DatabaseClient.getRawMaterialUsage()
    } catch (error) {
      console.error("[v0] Error fetching raw material usage:", error)
    }

    try {
      inventorySummary = await DatabaseClient.getInventorySummary()
    } catch (error) {
      console.error("[v0] Error fetching inventory summary:", error)
    }

    try {
      distributionPerformance = await DatabaseClient.getDistributionPerformance()
    } catch (error) {
      console.error("[v0] Error fetching distribution performance:", error)
    }

    try {
      productionProfitability = await DatabaseClient.getProductionProfitability()
    } catch (error) {
      console.error("[v0] Error fetching production profitability:", error)
    }

    console.log("[v0] Successfully fetched all data")

    // Filter data by date range if provided
    let filteredDistributions = distributionPerformance
    let filteredProduction = productionProfitability

    if (startDate && endDate) {
      filteredDistributions = distributionPerformance.filter((dist: any) => {
        const distDate = new Date(dist.distribution_date)
        return distDate >= new Date(startDate) && distDate <= new Date(endDate)
      })

      filteredProduction = productionProfitability.filter((prod: any) => {
        const prodDate = new Date(prod.production_date)
        return prodDate >= new Date(startDate) && prodDate <= new Date(endDate)
      })
    }

    const monthlyData = {
      financial: monthlyFinancial,
      rawMaterials: rawMaterialUsage,
      inventory: inventorySummary,
      distributions: filteredDistributions,
      production: filteredProduction,
      summary: {
        totalInventoryValue: inventorySummary.reduce((sum: number, item: any) => sum + item.inventory_value, 0),
        totalRevenue: filteredDistributions.reduce((sum: number, dist: any) => sum + dist.total_value, 0),
        totalProfit: filteredDistributions.reduce((sum: number, dist: any) => sum + dist.gross_profit, 0),
        totalProductionCost: filteredProduction.reduce((sum: number, prod: any) => sum + prod.total_cost, 0),
        totalUnitsProduced: filteredProduction.reduce((sum: number, prod: any) => sum + prod.quantity_produced, 0),
        lowStockItems: inventorySummary.filter((item: any) => item.stock_status === "Low Stock").length,
      },
    }

    console.log("[v0] Returning monthly data response")
    return NextResponse.json(createSuccessResponse(monthlyData))
  } catch (error) {
    console.error("[v0] Monthly analytics API error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
