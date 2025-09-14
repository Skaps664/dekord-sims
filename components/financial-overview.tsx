"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, Package, ShoppingCart, AlertTriangle, Factory } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  inventoryType: "finished" | "raw"
  quantity: number
  minStock: number
  unitCost: number
  sellingPrice?: number
  supplier: string
  lastUpdated: string
  barcode?: string
  batchId?: string
  batchName?: string
  productId?: string
}

interface Distribution {
  id: string
  recipient: string
  recipientType: "distributor" | "shop_keeper" | "individual" | "friend_family" | "influencer_marketing"
  location: string
  personName: string
  phoneNumber: string
  cnic: string
  items: {
    itemId: string
    itemName: string
    quantity: number
    unitCost: number
    sellingPrice: number
    batchId?: string
    batchName?: string
  }[]
  totalValue: number
  totalProfit: number
  date: string
  status: "pending" | "completed" | "cancelled"
  month: string
}

interface ProductionBatch {
  id: string
  batchName: string
  productId: string
  productName: string
  unitsProduced: number
  productionDate: string
  month: string
  rawMaterials: { itemId: string; itemName: string; quantity: number; unitCost: number }[]
  fixedCosts: {
    labor: number
    electricity: number
    packing: number
    advertising: number
  }
  miscellaneousCosts: { description: string; amount: number }[]
  totalRawMaterialCost: number
  totalFixedCosts: number
  totalMiscellaneousCosts: number
  totalCost: number
  costPerUnit: number
}

interface FinancialOverviewProps {
  inventory: InventoryItem[]
  distributions: Distribution[]
  selectedMonth: string
  productionBatches: ProductionBatch[] // Added production batches for cost analysis
}

export function FinancialOverview({
  inventory,
  distributions,
  selectedMonth,
  productionBatches,
}: FinancialOverviewProps) {
  const finishedProducts = inventory.filter((item) => item.inventoryType === "finished")
  const rawMaterials = inventory.filter((item) => item.inventoryType === "raw")

  const totalFinishedProductsValue = finishedProducts.reduce(
    (sum, item) => sum + item.quantity * (item.sellingPrice || item.unitCost),
    0,
  )
  const totalRawMaterialsValue = rawMaterials.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const totalInventoryValue = totalFinishedProductsValue + totalRawMaterialsValue

  const completedDistributions = distributions.filter((d) => d.status === "completed" && d.month === selectedMonth)
  const totalRevenue = completedDistributions.reduce((sum, dist) => sum + dist.totalValue, 0)
  const totalCost = completedDistributions.reduce(
    (sum, dist) => sum + dist.items.reduce((itemSum, item) => itemSum + item.quantity * item.unitCost, 0),
    0,
  )
  const totalProfit = completedDistributions.reduce((sum, dist) => sum + dist.totalProfit, 0) // Use calculated profit from distributions
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const pendingValue = distributions
    .filter((d) => d.status === "pending" && d.month === selectedMonth)
    .reduce((sum, dist) => sum + dist.totalValue, 0)

  const monthlyBatches = productionBatches.filter((batch) => batch.month === selectedMonth)
  const totalProductionCost = monthlyBatches.reduce((sum, batch) => sum + batch.totalCost, 0)
  const totalUnitsProduced = monthlyBatches.reduce((sum, batch) => sum + batch.unitsProduced, 0)
  const avgProductionCostPerUnit = totalUnitsProduced > 0 ? totalProductionCost / totalUnitsProduced : 0

  const categoryBreakdown = {
    "Finished Products": totalFinishedProductsValue,
    "Raw Materials": totalRawMaterialsValue,
  }

  const topItems = inventory
    .map((item) => ({
      ...item,
      totalValue:
        item.quantity * (item.inventoryType === "finished" ? item.sellingPrice || item.unitCost : item.unitCost),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)

  const recipientTypeBreakdown = completedDistributions.reduce(
    (acc, dist) => {
      acc[dist.recipientType] = (acc[dist.recipientType] || 0) + dist.totalValue
      return acc
    },
    {} as Record<string, number>,
  )

  const recipientProfitBreakdown = completedDistributions.reduce(
    (acc, dist) => {
      if (!acc[dist.recipientType]) {
        acc[dist.recipientType] = { revenue: 0, profit: 0, orders: 0 }
      }
      acc[dist.recipientType].revenue += dist.totalValue
      acc[dist.recipientType].profit += dist.totalProfit
      acc[dist.recipientType].orders += 1
      return acc
    },
    {} as Record<string, { revenue: number; profit: number; orders: number }>,
  )

  const lowStockItems = inventory.filter((item) => item.quantity <= item.minStock)

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Financial Overview -{" "}
          {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <p className="text-slate-600">Manufacturing financial metrics and profitability analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-slate-500">
              Products: ${totalFinishedProductsValue.toLocaleString()} | Materials: $
              {totalRawMaterialsValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-slate-500">From {completedDistributions.length} distributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Monthly Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">Margin: {profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Production Cost</CardTitle>
            <Factory className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${totalProductionCost.toLocaleString()}</div>
            <p className="text-xs text-slate-500">${avgProductionCostPerUnit.toFixed(2)}/unit avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">${pendingValue.toLocaleString()}</div>
            <p className="text-xs text-slate-500">Awaiting completion</p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription className="text-amber-700">Items running low on stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium text-slate-900">{item.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {item.inventoryType === "finished" ? "Product" : "Material"}
                    </Badge>
                    {item.batchName && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        {item.batchName}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-amber-800">
                      {item.quantity} / {item.minStock} min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Breakdown</CardTitle>
            <CardDescription>Value distribution between products and materials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryBreakdown).map(([category, value]) => {
                const percentage = totalInventoryValue > 0 ? (value / totalInventoryValue) * 100 : 0
                const color = category === "Finished Products" ? "bg-green-600" : "bg-blue-600"
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 ${color} rounded-full`}></div>
                      <span className="text-sm font-medium">{category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${value.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability by Channel</CardTitle>
            <CardDescription>Profit analysis by recipient type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(recipientProfitBreakdown)
                .sort(([, a], [, b]) => b.profit - a.profit)
                .map(([type, data]) => {
                  const profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
                  const displayName = type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        <div>
                          <span className="text-sm font-medium">{displayName}</span>
                          <div className="text-xs text-slate-500">{data.orders} orders</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">${data.profit.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{profitMargin.toFixed(1)}% margin</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {monthlyBatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Production Analysis</CardTitle>
            <CardDescription>Manufacturing cost breakdown for {monthlyBatches.length} batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalUnitsProduced}</div>
                <div className="text-sm text-blue-700">Units Produced</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">${totalProductionCost.toLocaleString()}</div>
                <div className="text-sm text-orange-700">Total Production Cost</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${avgProductionCostPerUnit.toFixed(2)}</div>
                <div className="text-sm text-green-700">Avg Cost Per Unit</div>
              </div>
            </div>
            <div className="space-y-2">
              {monthlyBatches.slice(0, 5).map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">{batch.batchName}</div>
                    <div className="text-sm text-slate-600">
                      {batch.productName} • {batch.unitsProduced} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${batch.totalCost.toLocaleString()}</div>
                    <div className="text-sm text-slate-500">${batch.costPerUnit.toFixed(2)}/unit</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Items by Value */}
      <Card>
        <CardHeader>
          <CardTitle>Top Items by Value</CardTitle>
          <CardDescription>Highest value inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topItems.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.sku}
                      {item.batchName && ` • Batch: ${item.batchName}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${item.totalValue.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">
                    {item.quantity} × $
                    {item.inventoryType === "finished" ? item.sellingPrice || item.unitCost : item.unitCost}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
