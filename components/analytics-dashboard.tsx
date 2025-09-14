"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Target,
  Award,
  Star,
  Crown,
  Medal,
  Loader2,
} from "lucide-react"
import { formatCurrency } from "@/lib/api-helpers"

interface AnalyticsData {
  inventory: any[]
  distributions: any[]
  production: any[]
  topProducts: any[]
  financial: any[]
}

interface AnalyticsDashboardProps {
  onBack?: () => void
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/analytics/overview")
      const result = await response.json()

      if (result.success) {
        setAnalyticsData(result.data)
      } else {
        console.error("Failed to fetch analytics:", result.error)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Calculate seller analytics from distribution data
  const sellerAnalytics = useMemo(() => {
    if (!analyticsData?.distributions) return []

    const sellerMap = new Map()
    analyticsData.distributions.forEach((dist: any) => {
      const key = dist.recipient_name
      if (!sellerMap.has(key)) {
        sellerMap.set(key, {
          recipient: dist.recipient_name,
          contact: dist.recipient_contact || "N/A",
          totalSales: 0,
          totalProfit: 0,
          totalQuantity: 0,
          orderCount: 0,
        })
      }

      const seller = sellerMap.get(key)
      seller.totalSales += dist.total_value
      seller.totalProfit += dist.gross_profit
      seller.totalQuantity += dist.quantity
      seller.orderCount += 1
    })

    return Array.from(sellerMap.values()).sort((a, b) => b.totalProfit - a.totalProfit)
  }, [analyticsData])

  // Monthly trend data
  const monthlyTrends = useMemo(() => {
    if (!analyticsData?.distributions || !analyticsData?.production) return []

    const monthMap = new Map()

    // Process distributions
    analyticsData.distributions.forEach((dist: any) => {
      const month = new Date(dist.distribution_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthMap.has(month)) {
        monthMap.set(month, { month, sales: 0, profit: 0, orders: 0, production: 0, productionCost: 0 })
      }
      const monthData = monthMap.get(month)
      monthData.sales += dist.total_value
      monthData.profit += dist.gross_profit
      monthData.orders += 1
    })

    // Process production
    analyticsData.production.forEach((prod: any) => {
      const month = new Date(prod.production_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      if (!monthMap.has(month)) {
        monthMap.set(month, { month, sales: 0, profit: 0, orders: 0, production: 0, productionCost: 0 })
      }
      const monthData = monthMap.get(month)
      monthData.production += prod.quantity_produced
      monthData.productionCost += prod.total_cost
    })

    return Array.from(monthMap.values()).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [analyticsData])

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return <Star className="w-5 h-5 text-slate-400" />
    }
  }

  const totalStats = useMemo(() => {
    if (!analyticsData) return { totalSellers: 0, totalSales: 0, totalProfit: 0, totalOrders: 0, avgOrderValue: 0 }

    const totalSales = analyticsData.distributions.reduce((sum: number, d: any) => sum + d.total_value, 0)
    const totalProfit = analyticsData.distributions.reduce((sum: number, d: any) => sum + d.gross_profit, 0)
    const totalOrders = analyticsData.distributions.length

    return {
      totalSellers: sellerAnalytics.length,
      totalSales,
      totalProfit,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    }
  }, [analyticsData, sellerAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading analytics...</span>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Distribution
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Sellers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalStats.totalSellers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalStats.totalSales)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{formatCurrency(totalStats.totalProfit)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{totalStats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-700">Avg Order Value</CardTitle>
            <Target className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900">{formatCurrency(totalStats.avgOrderValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leaderboard">Seller Leaderboard</TabsTrigger>
          <TabsTrigger value="products">Product Performance</TabsTrigger>
          <TabsTrigger value="trends">Sales Trends</TabsTrigger>
          <TabsTrigger value="production">Production Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Performers by Profit
                </CardTitle>
                <CardDescription>Sellers ranked by total profit generated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sellerAnalytics.slice(0, 10).map((seller, index) => (
                    <div key={seller.recipient} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <span className="font-bold text-lg">#{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{seller.recipient}</div>
                        <div className="text-sm text-slate-600">{seller.contact}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(seller.totalProfit)}</div>
                        <div className="text-sm text-slate-500">{seller.orderCount} orders</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Sellers by Sales Volume</CardTitle>
                <CardDescription>Total sales value comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sellerAnalytics.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="recipient" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Sales"]} />
                    <Bar dataKey="totalSales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>Products ranked by total profit</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.topProducts.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Profit"]} />
                    <Bar dataKey="total_profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Sales Distribution</CardTitle>
                <CardDescription>Market share by product revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={analyticsData.topProducts.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="total_revenue"
                      label={({ product_name, percent }) => `${product_name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.topProducts.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Sales & Profit Trends</CardTitle>
                <CardDescription>Track performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Sales"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Volume Trend</CardTitle>
                <CardDescription>Number of orders per month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={3} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Production Profitability</CardTitle>
                <CardDescription>Profit margins by production batch</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.production.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="batch_number" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [value.toFixed(1) + "%", "Profit Margin"]} />
                    <Bar dataKey="profit_margin_percent" fill="#f59e0b" name="Profit Margin %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Cost Analysis</CardTitle>
                <CardDescription>Cost per unit vs selling price</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.production.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                    <Bar dataKey="cost_per_unit" fill="#ef4444" name="Cost per Unit" />
                    <Bar dataKey="unit_price" fill="#10b981" name="Selling Price" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
