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

    // Fetch all required data
    const [
      monthlyFinancial,
      inventory,
      distributions,
      productionBatches,
      products
    ] = await Promise.all([
      DatabaseClient.getMonthlyFinancialSummary().catch(() => []),
      DatabaseClient.getInventory().catch(() => []),
      DatabaseClient.getDistributions().catch(() => []),
      DatabaseClient.getProductionBatches().catch(() => []),
      DatabaseClient.getProducts().catch(() => [])
    ])

    console.log("[v0] Successfully fetched all data")

    // Filter distributions and production batches by date range
    let filteredDistributions = distributions
    let filteredProduction = productionBatches

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      filteredDistributions = distributions.filter((dist: any) => {
        const distDate = new Date(dist.distribution_date || dist.date)
        return distDate >= start && distDate <= end
      })

      filteredProduction = productionBatches.filter((batch: any) => {
        const prodDate = new Date(batch.production_date || batch.productionDate)
        return prodDate >= start && prodDate <= end
      })
    }

    // Enhance distributions with product names and calculate metrics
    const enhancedDistributions = filteredDistributions.map((dist: any) => {
      const product = products.find((p: any) => 
        p.id === dist.product_id || p.id === dist.productId
      ) as any
      return {
        ...dist,
        product_name: product?.name || dist.product_name || 'Unknown Product',
        total_value: dist.total_amount || dist.totalValue || 0,
        cost_of_goods_sold: (dist.quantity || 0) * (dist.unit_cost || dist.unitCost || 0),
        gross_profit: dist.gross_profit || dist.totalProfit || 0,
        profit_margin_percent: dist.total_amount 
          ? ((dist.gross_profit || 0) / dist.total_amount) * 100 
          : 0
      }
    })

    // Enhance production batches with product names
    const enhancedProduction = filteredProduction.map((batch: any) => {
      const product = products.find((p: any) => 
        p.id === batch.product_id || p.id === batch.productId
      ) as any
      return {
        ...batch,
        product_name: product?.name || batch.product_name || 'Unknown Product',
        cost_per_unit: batch.cost_per_unit || batch.costPerUnit || 0,
        quantity_produced: batch.quantity_produced || batch.quantityProduced || 0
      }
    })

    // Process inventory with stock status
    const inventoryWithStatus = inventory.map((item: any) => {
      const quantity = item.quantity || item.current_stock || 0
      const minStock = item.minimum_stock || item.minStock || 0
      const unitCost = item.unit_cost || item.unitCost || 0
      
      return {
        ...item,
        stock_status: quantity <= minStock ? "Low Stock" : "In Stock",
        inventory_value: quantity * unitCost
      }
    })

    // Calculate raw material usage from production batches
    const rawMaterialUsageMap = new Map()
    filteredProduction.forEach((batch: any) => {
      if (batch.raw_materials_used && Array.isArray(batch.raw_materials_used)) {
        batch.raw_materials_used.forEach((rm: any) => {
          const id = rm.material_id || rm.materialId
          if (!rawMaterialUsageMap.has(id)) {
            rawMaterialUsageMap.set(id, {
              material_id: id,
              material_name: rm.material_name || rm.materialName || `Material ${id}`,
              total_used: 0,
              total_cost_used: 0,
              unit: rm.unit || 'units',
              stock_status: 'N/A'
            })
          }
          const current = rawMaterialUsageMap.get(id)
          current.total_used += rm.quantity_used || rm.quantityUsed || 0
          current.total_cost_used += (rm.quantity_used || rm.quantityUsed || 0) * (rm.unit_cost || rm.unitCost || 0)
        })
      }
    })

    const rawMaterialUsage = Array.from(rawMaterialUsageMap.values())

    // Calculate summary metrics
    const totalInventoryValue = inventoryWithStatus.reduce((sum: number, item: any) => 
      sum + (item.inventory_value || 0), 0
    )
    const totalRevenue = enhancedDistributions.reduce((sum: number, dist: any) => 
      sum + (dist.total_amount || dist.totalValue || 0), 0
    )
    const totalProfit = enhancedDistributions.reduce((sum: number, dist: any) => 
      sum + (dist.gross_profit || dist.totalProfit || 0), 0
    )
    const totalProductionCost = enhancedProduction.reduce((sum: number, batch: any) => 
      sum + (batch.total_cost || batch.totalCost || 0), 0
    )
    const totalUnitsProduced = enhancedProduction.reduce((sum: number, batch: any) => 
      sum + (batch.quantity_produced || batch.quantityProduced || 0), 0
    )
    const lowStockItems = inventoryWithStatus.filter((item: any) => 
      item.stock_status === "Low Stock"
    ).length

    const monthlyData = {
      financial: monthlyFinancial,
      rawMaterials: rawMaterialUsage,
      inventory: inventoryWithStatus,
      distributions: enhancedDistributions,
      production: enhancedProduction,
      summary: {
        totalInventoryValue,
        totalRevenue,
        totalProfit,
        totalProductionCost,
        totalUnitsProduced,
        lowStockItems,
      },
    }

    console.log("[v0] Returning monthly data response")
    return NextResponse.json(createSuccessResponse(monthlyData))
  } catch (error) {
    console.error("[v0] Monthly analytics API error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
