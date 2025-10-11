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

interface RecoverySummary {
  totalDistributed: number
  totalRecovered: number
  totalOutstanding: number
  recoveryRate: number
  recipients: {
    recipientName: string
    recipientType: string
    totalDistributed: number
    totalRecovered: number
    totalOutstanding: number
    distributionCount: number
  }[]
}

interface MonthlyReportsProps {
  selectedMonth: string
  recoverySummary?: RecoverySummary | null
}

export function MonthlyReports({ selectedMonth, recoverySummary }: MonthlyReportsProps) {
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
      value: (monthlyData.inventory || [])
        .filter((item: any) => item.stock_status !== "Low Stock")
        .reduce((sum: number, item: any) => sum + (item.inventory_value || 0), 0),
      count: (monthlyData.inventory || []).filter((item: any) => item.stock_status !== "Low Stock").length,
    },
    {
      category: "Low Stock Items",
      value: (monthlyData.inventory || [])
        .filter((item: any) => item.stock_status === "Low Stock")
        .reduce((sum: number, item: any) => sum + (item.inventory_value || 0), 0),
      count: (monthlyData.inventory || []).filter((item: any) => item.stock_status === "Low Stock").length,
    },
  ]

  const profitabilityData = (monthlyData.distributions || []).map((dist: any) => ({
    name: dist.product_name || 'Unknown',
    revenue: dist.total_value || dist.total_amount || 0,
    cost: dist.cost_of_goods_sold || 0,
    profit: dist.gross_profit || 0,
    margin: dist.profit_margin_percent || 0,
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
                <div className="text-2xl font-bold text-slate-900">{(monthlyData.distributions || []).length}</div>
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

          {/* Payment Recovery Metrics */}
          {recoverySummary && (
            <>
              <h4 className="text-lg font-semibold text-slate-800 mt-6 mb-4">Payment Recovery</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Recovered</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(recoverySummary.totalRecovered)}
                    </div>
                    <p className="text-xs text-slate-500">Payment collections</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Outstanding</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      {formatCurrency(recoverySummary.totalOutstanding)}
                    </div>
                    <p className="text-xs text-slate-500">Pending payments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Recovery Rate</CardTitle>
                    <Target className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {recoverySummary.recoveryRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-500">Collection efficiency</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Distributed Value</CardTitle>
                    <Package className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(recoverySummary.totalDistributed)}
                    </div>
                    <p className="text-xs text-slate-500">Total distributed</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
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
                  <ComposedChart data={(profitabilityData || []).slice(0, 10)}>
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
                      label={(entry: any) => `${entry.category}: ${formatCurrency(entry.value)}`}
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
                  <BarChart data={(monthlyData.production || []).slice(0, 10)}>
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
                  {(monthlyData.rawMaterials || []).slice(0, 5).map((material: any, index: number) => (
                    <div
                      key={material.material_id || index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="font-medium">{material.material_name || 'Unknown Material'}</div>
                          <div className="text-sm text-slate-600">
                            {formatNumber(material.total_used || 0)} {material.unit || 'units'} used
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(material.total_cost_used || 0)}</div>
                        <div className="text-sm text-slate-500">{material.stock_status || 'N/A'}</div>
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
                <AreaChart data={monthlyData.financial || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="2"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="Expenses"
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
                {(monthlyData.distributions || [])
                  .sort((a: any, b: any) => (b.gross_profit || 0) - (a.gross_profit || 0))
                  .slice(0, 10)
                  .map((dist: any, index: number) => (
                    <div key={dist.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{dist.recipient_name || 'Unknown Recipient'}</div>
                          <div className="text-sm text-slate-600">
                            {dist.product_name || 'Unknown Product'} × {formatNumber(dist.quantity || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(dist.gross_profit || 0)}</div>
                        <div className="text-sm text-slate-500">{(dist.profit_margin_percent || 0).toFixed(1)}% margin</div>
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
