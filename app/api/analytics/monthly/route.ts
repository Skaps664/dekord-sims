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
      // First, find the inventory item to get the product_id
      const inventoryItem = inventory.find((inv: any) => 
        inv.id === dist.inventory_item_id
      )
      
      // Then find the product using the product_id from inventory
      const product = inventoryItem ? products.find((p: any) => 
        p.id === (inventoryItem as any).product_id || p.id === (inventoryItem as any).productId
      ) : null
      
      const costPrice = (inventoryItem as any)?.unit_cost || 0
      const unitPrice = dist.unit_price || 0
      const quantity = dist.quantity || 0
      
      const costOfGoodsSold = costPrice * quantity
      const totalValue = unitPrice * quantity
      const grossProfit = totalValue - costOfGoodsSold
      const profitMarginPercent = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0
      
      // Use product name from product lookup, or inventory item name as fallback
      const productName = (product as any)?.name || (inventoryItem as any)?.name || dist.product_name || 'Unknown Product'
      
      return {
        ...dist,
        product_id: (inventoryItem as any)?.product_id || (inventoryItem as any)?.productId || dist.product_id,
        product_name: productName,
        total_value: totalValue,
        cost_of_goods_sold: costOfGoodsSold,
        gross_profit: grossProfit,
        profit_margin_percent: profitMarginPercent
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
      const quantity = item.quantity || 0  // Real-time quantity
      const minStock = item.minimum_stock || item.minStock || 0
      const unitCost = item.unit_cost || item.unitCost || 0
      const sellingPrice = item.selling_price || item.sellingPrice || 0
      
      // For finished products use selling price, for raw materials use unit cost
      const isFinished = item.item_type === "finished_product" || item.inventoryType === "finished"
      const priceToUse = isFinished ? (sellingPrice || unitCost) : unitCost
      
      return {
        ...item,
        stock_status: quantity <= minStock ? "Low Stock" : "In Stock",
        inventory_value: quantity * priceToUse  // Use quantity, not current_stock
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

    // Calculate summary metrics using real-time quantity
    const finishedProductsInInventory = inventoryWithStatus.filter((item: any) => 
      item.item_type === "finished_product" || item.inventoryType === "finished"
    )
    const rawMaterialsInInventory = inventoryWithStatus.filter((item: any) => 
      item.item_type === "raw_material" || item.inventoryType === "raw"
    )
    
    const totalFinishedValue = finishedProductsInInventory.reduce((sum: number, item: any) => {
      const quantity = item.quantity || 0
      const price = item.selling_price || item.sellingPrice || item.unit_cost || item.unitCost || 0
      return sum + (quantity * price)
    }, 0)
    
    const totalRawValue = rawMaterialsInInventory.reduce((sum: number, item: any) => {
      const quantity = item.quantity || 0
      const cost = item.unit_cost || item.unitCost || 0
      return sum + (quantity * cost)
    }, 0)
    
    const totalInventoryValue = totalFinishedValue + totalRawValue
    const totalRevenue = enhancedDistributions.reduce((sum: number, dist: any) => 
      sum + (dist.total_value || 0), 0
    )
    const totalProfit = enhancedDistributions.reduce((sum: number, dist: any) => 
      sum + (dist.gross_profit || 0), 0
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
