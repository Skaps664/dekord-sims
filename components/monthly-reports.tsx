"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  AreaChart,
  Line,
} from "recharts"
import { Download, TrendingUp, Package, Users, Target, AlertTriangle, Loader2 } from "lucide-react"
import { formatCurrency, formatNumber, formatDate } from "@/lib/api-helpers"

interface MonthlyData {
  financial: any[]
  rawMaterials: any[]
  inventory: any[]
  distributions: any[]
  production: any[]
  summary: {
    totalInventoryValue: number
    totalRevenue: number
    totalProfit: number
    totalProductionCost: number
    totalUnitsProduced: number
    lowStockItems: number
  }
}

interface MonthlyReportsProps {
  selectedMonth: string
}

export function MonthlyReports({ selectedMonth }: MonthlyReportsProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter" | "year">("month")

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)
      const startDate = new Date(selectedMonth + "-01")
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

      const response = await fetch(
        `/api/analytics/monthly?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
      )
      const result = await response.json()

      if (result.success) {
        setMonthlyData(result.data)
      } else {
        console.error("Failed to fetch monthly data:", result.error)
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyData()
  }, [selectedMonth])

  const exportReport = () => {
    if (!monthlyData) return

    const reportData = {
      period: selectedMonth,
      timeframe,
      generatedAt: new Date().toISOString(),
      summary: monthlyData.summary,
      inventory: monthlyData.inventory,
      distributions: monthlyData.distributions,
      production: monthlyData.production,
      financial: monthlyData.financial,
      rawMaterials: monthlyData.rawMaterials,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `manufacturing-report-${selectedMonth}-${timeframe}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading monthly reports...</span>
      </div>
    )
  }

  if (!monthlyData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">Failed to load monthly data</p>
      </div>
    )
  }

  // Process data for charts
  const categoryData = [
    {
      category: "Finished Products",
      value: monthlyData.inventory
        .filter((item: any) => item.stock_status !== "Low Stock")
        .reduce((sum: number, item: any) => sum + item.inventory_value, 0),
      count: monthlyData.inventory.filter((item: any) => item.stock_status !== "Low Stock").length,
    },
    {
      category: "Low Stock Items",
      value: monthlyData.inventory
        .filter((item: any) => item.stock_status === "Low Stock")
        .reduce((sum: number, item: any) => sum + item.inventory_value, 0),
      count: monthlyData.inventory.filter((item: any) => item.stock_status === "Low Stock").length,
    },
  ]

  const profitabilityData = monthlyData.distributions.map((dist: any) => ({
    name: dist.product_name,
    revenue: dist.total_value,
    cost: dist.cost_of_goods_sold,
    profit: dist.gross_profit,
    margin: dist.profit_margin_percent,
  }))

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Manufacturing Reports -{" "}
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <p className="text-slate-600">Comprehensive analysis of manufacturing operations and profitability</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={timeframe}
            onValueChange={(value: "week" | "month" | "quarter" | "year") => setTimeframe(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Overview Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Inventory</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(monthlyData.summary.totalInventoryValue)}
                </div>
                <p className="text-xs text-slate-500">Current value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(monthlyData.summary.totalRevenue)}
                </div>
                <p className="text-xs text-slate-500">From sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Profit</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(monthlyData.summary.totalProfit)}
                </div>
                <p className="text-xs text-slate-500">Net profit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Production</CardTitle>
                <Package className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(monthlyData.summary.totalUnitsProduced)}
                </div>
                <p className="text-xs text-slate-500">Units produced</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Distributions</CardTitle>
                <Users className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{monthlyData.distributions.length}</div>
                <p className="text-xs text-slate-500">Total orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{monthlyData.summary.lowStockItems}</div>
                <p className="text-xs text-slate-500">Items need restocking</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Profitability Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Profitability Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Cost Analysis</CardTitle>
                <CardDescription>Breakdown of revenue and costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={profitabilityData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                    <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={3} name="Profit" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Distribution</CardTitle>
                <CardDescription>Current inventory status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, value }) => `${category}: ${formatCurrency(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Production Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Production Analysis</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Production Efficiency</CardTitle>
                <CardDescription>Cost per unit analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData.production.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Cost per Unit"]} />
                    <Bar dataKey="cost_per_unit" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw Material Usage</CardTitle>
                <CardDescription>Top materials by cost</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.rawMaterials.slice(0, 5).map((material: any, index: number) => (
                    <div
                      key={material.material_id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{material.material_name}</div>
                          <div className="text-sm text-slate-600">
                            {formatNumber(material.total_used)} {material.unit} used
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(material.total_cost_used)}</div>
                        <div className="text-sm text-slate-500">{material.stock_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trends Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Trends Analysis</h3>
          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
              <CardDescription>Monthly financial performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthlyData.financial}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                  <Area
                    type="monotone"
                    dataKey="total_amount"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Total Amount"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recipients Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Recipients Analysis</h3>
          <Card>
            <CardHeader>
              <CardTitle>Top Recipients by Profit</CardTitle>
              <CardDescription>Most profitable customers this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyData.distributions
                  .sort((a: any, b: any) => b.gross_profit - a.gross_profit)
                  .slice(0, 10)
                  .map((dist: any, index: number) => (
                    <div key={dist.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{dist.recipient_name}</div>
                          <div className="text-sm text-slate-600">
                            {dist.product_name} × {formatNumber(dist.quantity)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(dist.gross_profit)}</div>
                        <div className="text-sm text-slate-500">{dist.profit_margin_percent.toFixed(1)}% margin</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
