"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { domToPng } from "modern-screenshot"
import jsPDF from "jspdf"
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
  LineChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts"
import { Download, TrendingUp, Package, Users, Target, AlertTriangle, Loader2, Calendar, Factory } from "lucide-react"
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
  const [dateRangeMode, setDateRangeMode] = useState<"month" | "60days" | "90days" | "custom">("month")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const getDateRange = () => {
    const today = new Date()
    
    switch (dateRangeMode) {
      case "month":
        // Use selectedMonth (e.g., "2025-10" for October 2025)
        const startDate = new Date(selectedMonth + "-01")
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
        return { startDate, endDate }
      
      case "60days":
        const end60 = new Date(today)
        const start60 = new Date(today)
        start60.setDate(start60.getDate() - 60)
        return { startDate: start60, endDate: end60 }
      
      case "90days":
        const end90 = new Date(today)
        const start90 = new Date(today)
        start90.setDate(start90.getDate() - 90)
        return { startDate: start90, endDate: end90 }
      
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(customEndDate)
          }
        }
        // Fallback to current month if custom dates not set
        const fallbackStart = new Date(selectedMonth + "-01")
        const fallbackEnd = new Date(fallbackStart.getFullYear(), fallbackStart.getMonth() + 1, 0)
        return { startDate: fallbackStart, endDate: fallbackEnd }
      
      default:
        const defaultStart = new Date(selectedMonth + "-01")
        const defaultEnd = new Date(defaultStart.getFullYear(), defaultStart.getMonth() + 1, 0)
        return { startDate: defaultStart, endDate: defaultEnd }
    }
  }

  const fetchMonthlyData = async () => {
    try {
      setLoading(true)
      const { startDate, endDate } = getDateRange()

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
  }, [selectedMonth, dateRangeMode, customStartDate, customEndDate])

  // Debug: Log monthlyData when it changes
  useEffect(() => {
    if (monthlyData) {
      console.log('📊 Monthly Data Loaded:', {
        distributions: monthlyData.distributions?.length || 0,
        production: monthlyData.production?.length || 0,
        inventory: monthlyData.inventory?.length || 0,
        rawMaterials: monthlyData.rawMaterials?.length || 0,
        summary: monthlyData.summary
      })
      if (monthlyData.distributions && monthlyData.distributions.length > 0) {
        console.log('Sample distribution:', monthlyData.distributions[0])
      }
      if (monthlyData.production && monthlyData.production.length > 0) {
        console.log('Sample production:', monthlyData.production[0])
      }
    }
  }, [monthlyData])

  const exportReport = async () => {
    if (!monthlyData || !reportRef.current) return
    
    try {
      setExporting(true)

      const { startDate, endDate } = getDateRange()
      const dateRangeLabel = `${formatDate(startDate)}_to_${formatDate(endDate)}`

      // Wait a moment for React to update the DOM
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use modern-screenshot instead of html2canvas - it supports oklch!
      const dataUrl = await domToPng(reportRef.current, {
        quality: 0.95,
        scale: 2,
        backgroundColor: '#ffffff',
      })

      // Create image from data URL
      const img = new Image()
      img.src = dataUrl
      
      await new Promise((resolve) => {
        img.onload = resolve
      })

      // Create PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (img.height * imgWidth) / img.width

      let heightLeft = imgHeight
      let position = 10

      // Add header to first page
      pdf.setFontSize(16)
      pdf.text('Manufacturing Report', pdfWidth / 2, position, { align: 'center' })
      position += 7
      pdf.setFontSize(10)
      pdf.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, pdfWidth / 2, position, { align: 'center' })
      position += 7
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pdfWidth / 2, position, { align: 'center' })
      position += 10

      // Add first page image
      pdf.addImage(dataUrl, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - position)

      // Add additional pages if needed
      let page = 1
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + position
        pdf.addPage()
        page++
        pdf.addImage(dataUrl, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // Add page numbers to all pages
      const totalPages = pdf.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' })
      }

      // Save the PDF
      pdf.save(`manufacturing-report-${dateRangeLabel}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExporting(false)
    }
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

  // Process data for charts - Filter finished products properly
  const finishedProducts = (monthlyData.inventory || []).filter((item: any) => 
    item.item_type === "finished_product" || item.inventoryType === "finished"
  )
  
  const rawMaterials = (monthlyData.inventory || []).filter((item: any) => 
    item.item_type === "raw_material" || item.inventoryType === "raw"
  )
  
  const lowStockItems = finishedProducts.filter((item: any) => {
    const qty = item.quantity || 0
    const minStock = item.minimum_stock || item.minStock || 0
    return qty <= minStock
  })
  
  const inStockProducts = finishedProducts.filter((item: any) => {
    const qty = item.quantity || 0
    const minStock = item.minimum_stock || item.minStock || 0
    return qty > minStock
  })
  
  // Calculate total values for pie chart
  const finishedProductsValue = finishedProducts.reduce((sum: number, item: any) => {
    const quantity = item.quantity || 0
    const price = item.selling_price || item.sellingPrice || item.unit_cost || item.unitCost || 0
    return sum + (quantity * price)
  }, 0)
  
  const rawMaterialsValue = rawMaterials.reduce((sum: number, item: any) => {
    const quantity = item.quantity || 0
    const price = item.unit_cost || item.unitCost || 0
    return sum + (quantity * price)
  }, 0)
  
  const categoryData = [
    {
      category: "Finished Products",
      value: finishedProductsValue,
      count: finishedProducts.length,
    },
    {
      category: "Raw Materials",
      value: rawMaterialsValue,
      count: rawMaterials.length,
    },
  ].filter(cat => cat.value > 0) // Only show categories with value
  
  console.log('📊 Category Data for Pie Chart:', categoryData)

  // Group distributions by product_name and aggregate
  const productProfitMap: Record<string, { revenue: number, cost: number, profit: number, count: number }> = {}
  
  console.log('🔍 Processing distributions for profitability:', monthlyData.distributions?.length || 0)
  
  ;(monthlyData.distributions || []).forEach((dist: any) => {
    const productName = dist.product_name || `Product ${dist.product_id || dist.inventory_item_id || 'Unknown'}`
    
    // Be more lenient - only skip if completely empty
    if (!productName || productName === 'Unknown') {
      console.log('⚠️ Skipping distribution with no product name:', dist)
      return
    }
    
    if (!productProfitMap[productName]) {
      productProfitMap[productName] = { revenue: 0, cost: 0, profit: 0, count: 0 }
    }
    
    productProfitMap[productName].revenue += dist.total_value || 0
    productProfitMap[productName].cost += dist.cost_of_goods_sold || 0
    productProfitMap[productName].profit += dist.gross_profit || 0
    productProfitMap[productName].count += 1
  })
  
  console.log('📈 Product profit map:', productProfitMap)
  
  const profitabilityData = Object.entries(productProfitMap)
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      count: data.count
    }))
    .sort((a, b) => b.profit - a.profit)
  
  console.log('📊 Profitability data:', profitabilityData)

  return (
    <div className="space-y-6">
      {/* Report Header with Controls - OUTSIDE PDF export area */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manufacturing Reports</h2>
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
          <Button onClick={exportReport} variant="outline" disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Date Range Selector - OUTSIDE PDF export area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Date Range Selection
          </CardTitle>
          <CardDescription>Choose a time period for your report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Mode Selector */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateRangeMode === "month" ? "default" : "outline"}
                onClick={() => setDateRangeMode("month")}
                size="sm"
              >
                Current Month
              </Button>
              <Button
                variant={dateRangeMode === "60days" ? "default" : "outline"}
                onClick={() => setDateRangeMode("60days")}
                size="sm"
              >
                Last 60 Days
              </Button>
              <Button
                variant={dateRangeMode === "90days" ? "default" : "outline"}
                onClick={() => setDateRangeMode("90days")}
                size="sm"
              >
                Last 90 Days
              </Button>
              <Button
                variant={dateRangeMode === "custom" ? "default" : "outline"}
                onClick={() => setDateRangeMode("custom")}
                size="sm"
              >
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRangeMode === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate || undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate || undefined}
                  />
                </div>
              </div>
            )}

            {/* Display Selected Range */}
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <strong>Selected Period:</strong>{" "}
              {(() => {
                const { startDate, endDate } = getDateRange()
                return `${startDate.toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })} - ${endDate.toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}`
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* START: Content to be exported as PDF */}
      <div ref={reportRef} className="space-y-8">
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
                  {formatCurrency((() => {
                    // Calculate like Financial tab - use quantity (real-time) not current_stock
                    const finishedProducts = (monthlyData.inventory || []).filter((item: any) => 
                      item.item_type === "finished_product" || item.inventoryType === "finished"
                    )
                    const rawMaterials = (monthlyData.inventory || []).filter((item: any) => 
                      item.item_type === "raw_material" || item.inventoryType === "raw"
                    )
                    
                    const finishedValue = finishedProducts.reduce((sum: number, item: any) => {
                      const quantity = item.quantity || 0
                      const price = item.selling_price || item.sellingPrice || item.unit_cost || item.unitCost || 0
                      return sum + (quantity * price)
                    }, 0)
                    
                    const rawValue = rawMaterials.reduce((sum: number, item: any) => {
                      const quantity = item.quantity || 0
                      const cost = item.unit_cost || item.unitCost || 0
                      return sum + (quantity * cost)
                    }, 0)
                    
                    return finishedValue + rawValue
                  })())}
                </div>
                <p className="text-xs text-slate-500">
                  Products: {formatCurrency((() => {
                    const finishedProducts = (monthlyData.inventory || []).filter((item: any) => 
                      item.item_type === "finished_product" || item.inventoryType === "finished"
                    )
                    return finishedProducts.reduce((sum: number, item: any) => {
                      const quantity = item.quantity || 0
                      const price = item.selling_price || item.sellingPrice || item.unit_cost || item.unitCost || 0
                      return sum + (quantity * price)
                    }, 0)
                  })())} | Materials: {formatCurrency((() => {
                    const rawMaterials = (monthlyData.inventory || []).filter((item: any) => 
                      item.item_type === "raw_material" || item.inventoryType === "raw"
                    )
                    return rawMaterials.reduce((sum: number, item: any) => {
                      const quantity = item.quantity || 0
                      const cost = item.unit_cost || item.unitCost || 0
                      return sum + (quantity * cost)
                    }, 0)
                  })())}
                </p>
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
                <p className="text-xs text-slate-500">
                  From {(monthlyData.distributions || []).filter((d: any) => 
                    d.status === 'completed' || !d.status
                  ).length} distributions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Profit</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthlyData.summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(monthlyData.summary.totalProfit)}
                </div>
                <p className="text-xs text-slate-500">
                  Margin: {monthlyData.summary.totalRevenue > 0 
                    ? ((monthlyData.summary.totalProfit / monthlyData.summary.totalRevenue) * 100).toFixed(1) 
                    : '0.0'}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Production Cost</CardTitle>
                <Package className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(monthlyData.summary.totalProductionCost)}
                </div>
                <p className="text-xs text-slate-500">
                  {formatCurrency(monthlyData.summary.totalUnitsProduced > 0 
                    ? monthlyData.summary.totalProductionCost / monthlyData.summary.totalUnitsProduced 
                    : 0)}/unit avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Production</CardTitle>
                <Factory className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(monthlyData.summary.totalUnitsProduced)}
                </div>
                <p className="text-xs text-slate-500">
                  {(monthlyData.production || []).length} batches
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
                <p className="text-xs text-slate-500">Items need restocking</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Total Inventory Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Inventory Detailed Breakdown
                </CardTitle>
                <CardDescription>Complete inventory analysis for this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Finished Products Section */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Finished Products
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Total Items:</span>
                        <span className="font-semibold">{finishedProducts.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">In Stock Items:</span>
                        <span className="font-semibold">{inStockProducts.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Total Units Available:</span>
                        <span className="font-semibold">
                          {formatNumber(finishedProducts.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                        <span className="text-blue-900 font-semibold">Total Value:</span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(finishedProducts.reduce((sum: number, item: any) => {
                            const quantity = item.quantity || 0
                            const price = item.selling_price || item.sellingPrice || item.unit_cost || item.unitCost || 0
                            return sum + (quantity * price)
                          }, 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Materials Section */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Raw Materials
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const rawMaterials = (monthlyData.inventory || []).filter((item: any) => 
                          item.item_type === "raw_material" || item.inventoryType === "raw"
                        )
                        const totalRawValue = rawMaterials.reduce((sum: number, item: any) => {
                          const quantity = item.quantity || 0
                          const cost = item.unit_cost || item.unitCost || 0
                          return sum + (quantity * cost)
                        }, 0)
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-700">Total Materials:</span>
                              <span className="font-semibold">{rawMaterials.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-700">Total Units:</span>
                              <span className="font-semibold">
                                {formatNumber(rawMaterials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0))}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                              <span className="text-slate-900 font-semibold">Total Value:</span>
                              <span className="font-bold text-slate-900">{formatCurrency(totalRawValue)}</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  {lowStockItems.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Low Stock Items ({lowStockItems.length})
                      </h4>
                      <div className="space-y-1 text-sm">
                        {lowStockItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-amber-800">
                            <span>{item.name}</span>
                            <span className="font-semibold">{item.quantity || 0} / {item.minimum_stock || item.minStock || 0}</span>
                          </div>
                        ))}
                        {lowStockItems.length > 3 && (
                          <div className="text-amber-700 text-xs pt-1">+{lowStockItems.length - 3} more items</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Revenue & Profit Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Revenue & Profit Breakdown
                </CardTitle>
                <CardDescription>Sales performance and profitability analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Revenue Details */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">Revenue Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Total Distributions:</span>
                        <span className="font-semibold">{(monthlyData.distributions || []).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Completed Orders:</span>
                        <span className="font-semibold">
                          {(monthlyData.distributions || []).filter((d: any) => d.status === 'completed' || !d.status).length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Total Units Sold:</span>
                        <span className="font-semibold">
                          {formatNumber((monthlyData.distributions || []).reduce((sum: any, d: any) => sum + (d.quantity || 0), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                        <span className="text-green-900 font-semibold">Total Revenue:</span>
                        <span className="font-bold text-green-900">
                          {formatCurrency(monthlyData.summary.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Details */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3">Profit Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Gross Profit:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(monthlyData.summary.totalProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Cost of Goods Sold:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency((monthlyData.distributions || []).reduce((sum: any, d: any) => 
                            sum + (d.cost_of_goods_sold || 0), 0
                          ))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Profit Margin:</span>
                        <span className="font-semibold">
                          {monthlyData.summary.totalRevenue > 0 
                            ? ((monthlyData.summary.totalProfit / monthlyData.summary.totalRevenue) * 100).toFixed(1) 
                            : '0.0'}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-purple-200 pt-2">
                        <span className="text-purple-900 font-semibold">Avg Profit per Order:</span>
                        <span className="font-bold text-purple-900">
                          {formatCurrency((monthlyData.distributions || []).length > 0 
                            ? monthlyData.summary.totalProfit / (monthlyData.distributions || []).length 
                            : 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Products by Revenue */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Top Revenue Products</h4>
                    <div className="space-y-1 text-sm">
                      {profitabilityData.slice(0, 3).map((product: any, index: number) => (
                        <div key={index} className="flex justify-between text-blue-800">
                          <span className="truncate flex-1">{product.name}</span>
                          <span className="font-semibold ml-2">{formatCurrency(product.revenue)}</span>
                        </div>
                      ))}
                      {profitabilityData.length === 0 && (
                        <div className="text-blue-700 text-xs">No product data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Production Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-orange-600" />
                  Production Detailed Analysis
                </CardTitle>
                <CardDescription>Manufacturing performance and efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Production Summary */}
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">Production Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Total Batches:</span>
                        <span className="font-semibold">{(monthlyData.production || []).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Units Produced:</span>
                        <span className="font-semibold">{formatNumber(monthlyData.summary.totalUnitsProduced)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">Production Cost:</span>
                        <span className="font-semibold">{formatCurrency(monthlyData.summary.totalProductionCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-orange-200 pt-2">
                        <span className="text-orange-900 font-semibold">Avg Cost per Unit:</span>
                        <span className="font-bold text-orange-900">
                          {formatCurrency(monthlyData.summary.totalUnitsProduced > 0 
                            ? monthlyData.summary.totalProductionCost / monthlyData.summary.totalUnitsProduced 
                            : 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quality Metrics */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">Quality Control</h4>
                    <div className="space-y-2">
                      {(() => {
                        let totalProduced = 0
                        let totalRejected = 0
                        ;(monthlyData.production || []).forEach((batch: any) => {
                          totalProduced += batch.quantity_produced || batch.quantityProduced || 0
                          totalRejected += batch.rejected_units || 0
                        })
                        const totalAccepted = totalProduced - totalRejected
                        const acceptanceRate = totalProduced > 0 ? ((totalAccepted / totalProduced) * 100) : 100
                        
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-700">Units Accepted:</span>
                              <span className="font-semibold text-green-600">{formatNumber(totalAccepted)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-green-700">Units Rejected:</span>
                              <span className="font-semibold text-red-600">{formatNumber(totalRejected)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                              <span className="text-green-900 font-semibold">Acceptance Rate:</span>
                              <span className="font-bold text-green-900">{acceptanceRate.toFixed(1)}%</span>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Production Batches List */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Recent Batches</h4>
                    <div className="space-y-1 text-sm">
                      {(monthlyData.production || []).slice(0, 3).map((batch: any, index: number) => (
                        <div key={index} className="flex justify-between text-slate-800">
                          <span className="truncate flex-1">
                            {batch.product_name || `Batch ${batch.id}`}
                          </span>
                          <span className="font-semibold ml-2">
                            {formatNumber(batch.quantity_produced || batch.quantityProduced || 0)} units
                          </span>
                        </div>
                      ))}
                      {(monthlyData.production || []).length === 0 && (
                        <div className="text-slate-700 text-xs">No production data</div>
                      )}
                      {(monthlyData.production || []).length > 3 && (
                        <div className="text-slate-600 text-xs pt-1">+{(monthlyData.production || []).length - 3} more batches</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Detailed Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Distribution Details
                </CardTitle>
                <CardDescription>Sales distribution and customer analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Distribution Overview */}
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 mb-3">Distribution Overview</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-700">Total Distributions:</span>
                        <span className="font-semibold">{(monthlyData.distributions || []).length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-700">Unique Customers:</span>
                        <span className="font-semibold">
                          {new Set((monthlyData.distributions || []).map((d: any) => d.recipient_name).filter(Boolean)).size}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-700">Total Units Distributed:</span>
                        <span className="font-semibold">
                          {formatNumber((monthlyData.distributions || []).reduce((sum: any, d: any) => sum + (d.quantity || 0), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-indigo-200 pt-2">
                        <span className="text-indigo-900 font-semibold">Total Value:</span>
                        <span className="font-bold text-indigo-900">
                          {formatCurrency((monthlyData.distributions || []).reduce((sum: any, d: any) => 
                            sum + (d.total_value || 0), 0
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Customers */}
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Top Customers by Revenue</h4>
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const customerRevenue: Record<string, number> = {}
                        ;(monthlyData.distributions || []).forEach((dist: any) => {
                          const customer = dist.recipient_name || 'Unknown'
                          customerRevenue[customer] = (customerRevenue[customer] || 0) + (dist.total_value || 0)
                        })
                        const topCustomers = Object.entries(customerRevenue)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                        
                        return topCustomers.length > 0 ? (
                          topCustomers.map(([name, value], index) => (
                            <div key={index} className="flex justify-between text-green-800">
                              <span className="truncate flex-1">{name}</span>
                              <span className="font-semibold ml-2">{formatCurrency(value)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-green-700 text-xs">No distribution data</div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Products Distributed */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Products Distributed</h4>
                    <div className="space-y-1 text-sm">
                      {(() => {
                        const productQuantities: Record<string, number> = {}
                        ;(monthlyData.distributions || []).forEach((dist: any) => {
                          const product = dist.product_name || 'Unknown'
                          productQuantities[product] = (productQuantities[product] || 0) + (dist.quantity || 0)
                        })
                        const topProducts = Object.entries(productQuantities)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                        
                        return topProducts.length > 0 ? (
                          topProducts.map(([name, quantity], index) => (
                            <div key={index} className="flex justify-between text-blue-800">
                              <span className="truncate flex-1">{name}</span>
                              <span className="font-semibold ml-2">{formatNumber(quantity)} units</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-blue-700 text-xs">No product data</div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Distribution Status */}
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Order Status</h4>
                    <div className="space-y-2">
                      {(() => {
                        const completed = (monthlyData.distributions || []).filter((d: any) => d.status === 'completed' || !d.status).length
                        const pending = (monthlyData.distributions || []).filter((d: any) => d.status === 'pending').length
                        const cancelled = (monthlyData.distributions || []).filter((d: any) => d.status === 'cancelled').length
                        
                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-700">Completed:</span>
                              <span className="font-semibold text-green-600">{completed}</span>
                            </div>
                            {pending > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-700">Pending:</span>
                                <span className="font-semibold text-amber-600">{pending}</span>
                              </div>
                            )}
                            {cancelled > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-700">Cancelled:</span>
                                <span className="font-semibold text-red-600">{cancelled}</span>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
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
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value)]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="url(#revenueGradient)" name="Revenue" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="cost" fill="url(#costGradient)" name="Cost" radius={[8, 8, 0, 0]} />
                    <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={3} name="Profit" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  📊 <strong>What this shows:</strong> Compare revenue (green) vs costs (red) for each product. The purple line shows profit. 
                  Products where green bars are taller than red bars are profitable.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Distribution</CardTitle>
                <CardDescription>Current inventory status</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No inventory data available</p>
                      <p className="text-sm text-slate-400 mt-1">Add products to inventory to see distribution</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={(entry: any) => `${entry.category}: ${formatCurrency(entry.value)}`}
                          outerRadius={90}
                          innerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), "Value"]}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {categoryData.map((cat, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-xs font-medium text-slate-700">{cat.category}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(cat.value)}</div>
                          <div className="text-xs text-slate-500">{cat.count} items</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  📦 <strong>What this shows:</strong> Visual breakdown of inventory value by category (Finished Products vs Raw Materials). 
                  Larger slices mean higher value stored in that category.
                </p>
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
                  <BarChart data={(() => {
                    console.log('🏭 Processing production data:', monthlyData.production?.length || 0)
                    
                    const prodData = (monthlyData.production || [])
                      .map((batch: any) => {
                        const productName = batch.product_name || `Batch ${batch.id || batch.batch_number || 'Unknown'}`
                        const costPerUnit = batch.cost_per_unit || batch.costPerUnit || 0
                        const quantityProduced = batch.quantity_produced || batch.quantityProduced || 0
                        
                        return {
                          product_name: productName,
                          cost_per_unit: costPerUnit,
                          quantity_produced: quantityProduced
                        }
                      })
                      .filter((batch: any) => batch.cost_per_unit > 0 && batch.product_name !== 'Unknown')
                      .slice(0, 10)
                    
                    console.log('📊 Production chart data:', prodData)
                    
                    if (prodData.length === 0) {
                      return [{ product_name: 'No Production Data', cost_per_unit: 0 }]
                    }
                    return prodData
                  })()}>
                    <defs>
                      <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Cost per Unit"]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="cost_per_unit" fill="url(#productionGradient)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  🏭 <strong>What this shows:</strong> Cost to produce each unit of product. Lower bars mean more efficient production. 
                  Use this to identify which products are expensive to make.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Raw Material Usage</CardTitle>
                <CardDescription>Top materials by cost</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  console.log('🔍 Raw Materials Data:', monthlyData.rawMaterials)
                  
                  const materials = (monthlyData.rawMaterials || [])
                    .filter((material: any) => 
                      material.material_name && 
                      material.material_name !== 'Unknown Material' &&
                      material.material_name !== 'Material undefined' &&
                      !material.material_name.includes('undefined') &&
                      (material.total_cost_used || 0) > 0
                    )
                    .sort((a: any, b: any) => (b.total_cost_used || 0) - (a.total_cost_used || 0))
                    .slice(0, 5)
                  
                  console.log('📊 Filtered materials:', materials)
                  
                  if (materials.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium mb-2">No raw material usage data available</p>
                        <p className="text-sm text-slate-500 mb-4">
                          Production batches with material tracking will appear here
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg text-left max-w-md mx-auto">
                          <p className="text-xs text-blue-900 font-medium mb-2">💡 How to track materials:</p>
                          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Go to Production tab</li>
                            <li>Create a production batch</li>
                            <li>Add raw materials used in the batch</li>
                            <li>Complete the batch</li>
                          </ol>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <>
                      <div className="space-y-3">
                        {materials.map((material: any, index: number) => (
                          <div
                            key={material.material_id || index}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <div>
                                <div className="font-medium text-slate-900">{material.material_name}</div>
                                <div className="text-sm text-slate-600">
                                  {formatNumber(material.total_used || 0)} {material.unit || 'units'} used
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-slate-900">{formatCurrency(material.total_cost_used || 0)}</div>
                              <div className="text-xs text-slate-500">Total cost</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Summary Bar */}
                      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-700">Total Material Cost</div>
                          <div className="text-lg font-bold text-blue-900">
                            {formatCurrency((monthlyData.rawMaterials || []).reduce((sum: number, m: any) => 
                              sum + (m.total_cost_used || 0), 0
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {(monthlyData.rawMaterials || []).length} material(s) tracked
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Production Quality & Waste Analysis */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Production Quality & Waste</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Cards */}
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Production Summary</CardTitle>
                <CardDescription>Overall production metrics including quality control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(() => {
                    let totalProduced = 0
                    let totalRejected = 0
                    let totalAccepted = 0
                    let totalProductionCost = 0
                    let totalRejectedValue = 0
                    
                    ;(monthlyData.production || []).forEach((batch: any) => {
                      const produced = batch.quantity_produced || batch.quantityProduced || 0
                      const rejected = batch.rejected_units || 0
                      const accepted = produced - rejected
                      const costPerUnit = batch.cost_per_unit || batch.costPerUnit || 0
                      
                      totalProduced += produced
                      totalRejected += rejected
                      totalAccepted += accepted
                      totalProductionCost += (batch.total_cost || batch.totalCost || 0)
                      totalRejectedValue += rejected * costPerUnit
                    })
                    
                    const acceptanceRate = totalProduced > 0 ? ((totalAccepted / totalProduced) * 100) : 100
                    const rejectionRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100) : 0
                    
                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-blue-600 mb-1">Total Produced</div>
                          <div className="text-2xl font-bold text-blue-900">{formatNumber(totalProduced)}</div>
                          <div className="text-xs text-blue-600 mt-1">Units manufactured</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-green-600 mb-1">Accepted Units</div>
                          <div className="text-2xl font-bold text-green-900">{formatNumber(totalAccepted)}</div>
                          <div className="text-xs text-green-600 mt-1">{acceptanceRate.toFixed(1)}% acceptance rate</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-sm text-red-600 mb-1">Rejected Units</div>
                          <div className="text-2xl font-bold text-red-900">{formatNumber(totalRejected)}</div>
                          <div className="text-xs text-red-600 mt-1">{rejectionRate.toFixed(1)}% rejection rate</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <div className="text-sm text-amber-600 mb-1">Waste Cost</div>
                          <div className="text-2xl font-bold text-amber-900">{formatCurrency(totalRejectedValue)}</div>
                          <div className="text-xs text-amber-600 mt-1">Value of rejected units</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
            
            {/* Production Batches Detail */}
            <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                <CardTitle>Production Batches Detail</CardTitle>
                <CardDescription>Detailed breakdown of each production batch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const batches = (monthlyData.production || [])
                      .filter((batch: any) => 
                        batch.product_name && 
                        batch.product_name !== 'Unknown Product' &&
                        batch.product_name !== 'Unknown'
                      )
                    
                    if (batches.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500">
                          <p>No production data available for this period</p>
                          <p className="text-xs mt-2">Create production batches to see detailed analysis</p>
                        </div>
                      )
                    }
                    
                    return batches.map((batch: any, index: number) => {
                      const produced = batch.quantity_produced || batch.quantityProduced || 0
                      const rejected = batch.rejected_units || 0
                      const accepted = produced - rejected
                      const costPerUnit = batch.cost_per_unit || batch.costPerUnit || 0
                      const totalCost = batch.total_cost || batch.totalCost || 0
                      const rejectedValue = rejected * costPerUnit
                      const acceptanceRate = produced > 0 ? ((accepted / produced) * 100) : 100
                      
                      return (
                        <div key={batch.id || index} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-lg">{batch.product_name}</div>
                              <div className="text-sm text-slate-600">
                                Batch: {batch.batch_number || batch.batchName || `#${batch.id}`} • 
                                {batch.production_date ? ` ${new Date(batch.production_date).toLocaleDateString()}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-600">Total Cost</div>
                              <div className="font-bold text-lg">{formatCurrency(totalCost)}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                              <div className="text-xs text-slate-500">Produced</div>
                              <div className="font-semibold text-blue-600">{formatNumber(produced)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Accepted</div>
                              <div className="font-semibold text-green-600">{formatNumber(accepted)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Rejected</div>
                              <div className="font-semibold text-red-600">{formatNumber(rejected)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Quality Rate</div>
                              <div className="font-semibold">{acceptanceRate.toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">Cost/Unit</div>
                              <div className="font-semibold">{formatCurrency(costPerUnit)}</div>
                            </div>
                          </div>
                          
                          {rejected > 0 && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                              <span className="text-red-600 font-medium">⚠️ Waste Cost: {formatCurrency(rejectedValue)}</span>
                              <span className="text-slate-600"> ({rejected} units rejected)</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
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
                  <defs>
                    <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="expensesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="url(#revenueAreaGradient)"
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fill="url(#expensesAreaGradient)"
                    strokeWidth={2}
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                📈 <strong>What this shows:</strong> Track revenue (green) and expenses (red) trends over time. 
                Upward green trend = growing sales. Watch for months where expenses exceed revenue.
              </p>
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
                {(() => {
                  console.log('👥 Processing recipients:', monthlyData.distributions?.length || 0)
                  
                  const topRecipients = (monthlyData.distributions || [])
                    .filter((dist: any) => {
                      // Be more lenient - just need recipient name
                      const hasRecipient = dist.recipient_name && dist.recipient_name !== 'Unknown Recipient'
                      const hasProduct = dist.product_name  // Keep product but don't reject Unknown
                      return hasRecipient && hasProduct
                    })
                    .sort((a: any, b: any) => (b.gross_profit || 0) - (a.gross_profit || 0))
                    .slice(0, 10)
                  
                  console.log('📊 Top recipients data:', topRecipients)
                  
                  if (topRecipients.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-500">
                        <p>No distribution data available</p>
                        <p className="text-xs mt-2">Create distributions to see top recipients</p>
                      </div>
                    )
                  }
                  
                  return topRecipients.map((dist: any, index: number) => (
                    <div key={dist.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{dist.recipient_name}</div>
                          <div className="text-sm text-slate-600">
                            {dist.product_name} × {formatNumber(dist.quantity || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(dist.gross_profit || 0)}</div>
                        <div className="text-sm text-slate-500">{(dist.profit_margin_percent || 0).toFixed(1)}% margin</div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Advanced Analytics Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">Advanced Analytics</h3>
          
          {/* Sales Velocity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Velocity Analysis</CardTitle>
              <CardDescription>Track how fast products are moving - Units sold per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={(() => {
                  console.log('⚡ Processing sales velocity for', monthlyData.distributions?.length || 0, 'distributions')
                  
                  // Group distributions by product and calculate velocity
                  const productSales: Record<string, { name: string, totalUnits: number, days: number }> = {}
                  const { startDate, endDate } = getDateRange()
                  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                  
                  ;(monthlyData.distributions || []).forEach((dist: any) => {
                    const productName = dist.product_name || `Product ${dist.product_id || dist.inventory_item_id || 'Unknown'}`
                    
                    // Be more lenient - only skip if completely empty
                    if (!productName || productName === 'Unknown') return
                    
                    if (!productSales[productName]) {
                      productSales[productName] = { name: productName, totalUnits: 0, days: daysDiff }
                    }
                    productSales[productName].totalUnits += dist.quantity || 0
                  })
                  
                  const velocityData = Object.values(productSales)
                    .map(p => ({ 
                      name: p.name,
                      velocity: Number((p.totalUnits / p.days).toFixed(2)),
                      units: p.totalUnits
                    }))
                    .filter(p => !isNaN(p.velocity) && p.velocity > 0)
                    .sort((a, b) => b.velocity - a.velocity)
                    .slice(0, 10)
                  
                  console.log('📊 Sales velocity data:', velocityData)
                  
                  if (velocityData.length === 0) {
                    return [{ name: 'No Sales Data', velocity: 0, units: 0 }]
                  }
                  
                  return velocityData
                })()}>
                  <defs>
                    <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" label={{ value: 'Units/Day', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Total Units', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'velocity') return [value + ' units/day', 'Sales Velocity']
                      return [value + ' units', 'Total Units']
                    }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="velocity" fill="url(#velocityGradient)" name="Velocity" radius={[8, 8, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="units" stroke="#f59e0b" strokeWidth={2} name="Total Units" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                ⚡ <strong>What this shows:</strong> How fast each product is selling (units per day). Purple bars show sales speed, 
                orange line shows total units sold. Higher velocity = faster moving products.
              </p>
            </CardContent>
          </Card>

          {/* Profit Margin Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Trends</CardTitle>
              <CardDescription>Track profitability percentage across different products</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={(() => {
                  const chartData = profitabilityData
                    .filter(p => !isNaN(p.margin) && p.revenue > 0)
                    .slice(0, 10)
                  
                  if (chartData.length === 0) {
                    return [{ name: 'No Data', revenue: 0, cost: 0, margin: 0 }]
                  }
                  
                  return chartData
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" label={{ value: 'Amount (Rs)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Margin (%)', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="cost" fill="#ef4444" name="Cost" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={3} name="Margin %" dot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                💰 <strong>What this shows:</strong> Profit margin percentage (orange line) shows what % of revenue is profit. 
                Higher margin % = more profitable products. Aim for products with high margin and high revenue.
              </p>
            </CardContent>
          </Card>

          {/* Customer Lifetime Value */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Lifetime Value</CardTitle>
              <CardDescription>Total revenue and profit generated per customer</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={(() => {
                  console.log('💰 Processing customer lifetime value')
                  
                  // Aggregate by recipient
                  const customerData: Record<string, { revenue: number, profit: number, orders: number }> = {}
                  
                  ;(monthlyData.distributions || []).forEach((dist: any) => {
                    const customer = dist.recipient_name
                    if (!customer || customer === 'Unknown Recipient') return
                    
                    // Be more lenient with product names
                    const hasProduct = dist.product_name
                    if (!hasProduct) return
                    
                    if (!customerData[customer]) {
                      customerData[customer] = { revenue: 0, profit: 0, orders: 0 }
                    }
                    customerData[customer].revenue += dist.total_value || 0
                    customerData[customer].profit += dist.gross_profit || 0
                    customerData[customer].orders += 1
                  })
                  
                  const customerChartData = Object.entries(customerData)
                    .map(([name, data]) => ({ 
                      name, 
                      revenue: data.revenue,
                      profit: data.profit,
                      orders: data.orders
                    }))
                    .filter(c => !isNaN(c.revenue) && c.revenue > 0)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)
                  
                  console.log('📊 Customer lifetime value data:', customerChartData)
                  
                  if (customerChartData.length === 0) {
                    return [{ name: 'No Customer Data', revenue: 0, profit: 0, orders: 0 }]
                  }
                  
                  return customerChartData
                })()}>
                  <defs>
                    <linearGradient id="revenueCustomerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    </linearGradient>
                    <linearGradient id="profitCustomerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="url(#revenueCustomerGradient)" name="Total Revenue" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="profit" fill="url(#profitCustomerGradient)" name="Total Profit" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                👥 <strong>What this shows:</strong> Total value each customer has generated. Blue = total revenue, Green = profit. 
                Focus on customers with high revenue AND high profit for best relationships.
              </p>
            </CardContent>
          </Card>

          {/* Inventory Turnover Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Turnover Analysis</CardTitle>
              <CardDescription>How efficiently inventory is moving - Higher is better</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={(() => {
                  console.log('🔄 Processing inventory turnover')
                  
                  // Calculate turnover: (Units Sold / Average Inventory) for each product
                  const turnoverData: Record<string, { sold: number, current: number }> = {}
                  
                  // Get sold units from distributions
                  ;(monthlyData.distributions || []).forEach((dist: any) => {
                    const productName = dist.product_name || `Product ${dist.product_id || dist.inventory_item_id}`
                    if (!productName || productName === 'Unknown') return
                    
                    if (!turnoverData[productName]) {
                      turnoverData[productName] = { sold: 0, current: 0 }
                    }
                    turnoverData[productName].sold += dist.quantity || 0
                  })
                  
                  // Get current inventory
                  ;(monthlyData.inventory || []).forEach((item: any) => {
                    const productName = item.name
                    if (!productName || item.item_type !== 'finished_product') return
                    
                    if (!turnoverData[productName]) {
                      turnoverData[productName] = { sold: 0, current: 0 }
                    }
                    turnoverData[productName].current += item.quantity || 0
                  })
                  
                  const turnoverChartData = Object.entries(turnoverData)
                    .map(([name, data]) => {
                      const avgInventory = Math.max(1, (data.current + data.sold) / 2)
                      const turnoverRate = Number((data.sold / avgInventory).toFixed(2))
                      return {
                        name,
                        turnover: turnoverRate,
                        sold: data.sold,
                        current: data.current
                      }
                    })
                    .filter(p => !isNaN(p.turnover) && p.sold > 0)
                    .sort((a, b) => b.turnover - a.turnover)
                    .slice(0, 10)
                  
                  console.log('📊 Inventory turnover data:', turnoverChartData)
                  
                  if (turnoverChartData.length === 0) {
                    return [{ name: 'No Turnover Data', turnover: 0, sold: 0, current: 0 }]
                  }
                  
                  return turnoverChartData
                })()}>
                  <defs>
                    <linearGradient id="turnoverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis label={{ value: 'Turnover Rate', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'turnover') return [value + 'x', 'Turnover Rate']
                      return [value + ' units', name === 'sold' ? 'Units Sold' : 'Current Stock']
                    }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="turnover" fill="url(#turnoverGradient)" name="Turnover Rate" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                🔄 <strong>What this shows:</strong> How many times inventory "turns over" (sells and restocks). Higher turnover = efficient inventory. 
                Low turnover may mean slow-moving stock. Aim for 2-4x or higher for fast-moving products.
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>💡 Interpretation:</strong> Turnover rate shows how many times inventory "turns over" in the period.
                  Higher rates ({">"} 1.0) indicate fast-moving products. Lower rates ({"<"} 0.5) suggest slow movers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Deep Data Science Analytics Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-slate-900 border-b pb-2">🔬 Deep Data Science Analytics</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Performance Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Product Performance Radar</CardTitle>
                <CardDescription>Multi-dimensional product analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={(() => {
                    // Get top 5 products by revenue
                    const topProducts = profitabilityData
                      .filter(p => p.revenue > 0)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 5)
                    
                    if (topProducts.length === 0) {
                      return []
                    }
                    
                    // Create radar data - metrics are the axes, products are the data series
                    // Calculate max values for normalization
                    const maxRevenue = Math.max(...topProducts.map(p => p.revenue), 1)
                    const maxProfit = Math.max(...topProducts.map(p => p.profit), 1)
                    const maxMargin = Math.max(...topProducts.map(p => p.margin), 1)
                    
                    // Create one object per metric (these will be the axes)
                    const metrics = ['Revenue', 'Profit', 'Margin', 'Cost Efficiency', 'Volume']
                    
                    return metrics.map(metric => {
                      const dataPoint: any = { metric }
                      
                      topProducts.forEach((product, idx) => {
                        const productKey = `P${idx + 1}` // P1, P2, P3, etc
                        
                        // Calculate normalized score for this metric and product
                        let score = 0
                        if (metric === 'Revenue') {
                          score = Math.round((product.revenue / maxRevenue) * 100)
                        } else if (metric === 'Profit') {
                          score = Math.round((product.profit / maxProfit) * 100)
                        } else if (metric === 'Margin') {
                          score = Math.round((product.margin / maxMargin) * 100)
                        } else if (metric === 'Cost Efficiency') {
                          score = Math.round(Math.max(0, 100 - ((product.cost / product.revenue) * 100)))
                        } else if (metric === 'Volume') {
                          // Estimate based on revenue/profit ratio
                          score = Math.round(Math.min(100, (product.revenue / Math.max(product.profit, 1))))
                        }
                        
                        dataPoint[productKey] = Math.max(0, Math.min(100, score))
                      })
                      
                      return dataPoint
                    })
                  })()}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    {(() => {
                      const topProducts = profitabilityData
                        .filter((p: any) => p.revenue > 0)
                        .sort((a: any, b: any) => b.revenue - a.revenue)
                        .slice(0, 5)
                      
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']
                      
                      return topProducts.map((product: any, idx: number) => (
                        <Radar
                          key={idx}
                          name={product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name}
                          dataKey={`P${idx + 1}`}
                          stroke={colors[idx]}
                          fill={colors[idx]}
                          fillOpacity={0.25 + (idx * 0.05)}
                        />
                      ))
                    })()}
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="circle"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: any) => [`${value}/100`, 'Score']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  🎯 <strong>What this shows:</strong> Multi-dimensional view of top 5 products across 5 key metrics. 
                  Each colored area represents a product. Larger area = better overall performance. Compare shapes to see strengths/weaknesses.
                </p>
              </CardContent>
            </Card>

            {/* Profit Waterfall Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Waterfall Analysis</CardTitle>
                <CardDescription>How revenue transforms into profit</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={(() => {
                    const totalRevenue = monthlyData.summary.totalRevenue || 0
                    const totalCost = monthlyData.summary.totalProductionCost || 0
                    const totalProfit = monthlyData.summary.totalProfit || 0
                    
                    // Calculate distribution costs
                    const distributionCosts = (monthlyData.distributions || []).reduce((sum: number, d: any) => 
                      sum + (d.cost_of_goods_sold || 0), 0
                    )
                    
                    const operatingExpenses = totalCost
                    const netProfit = totalProfit
                    
                    return [
                      { name: 'Revenue', value: totalRevenue, fill: '#10b981' },
                      { name: 'COGS', value: -distributionCosts, fill: '#ef4444' },
                      { name: 'Gross Profit', value: totalRevenue - distributionCosts, fill: '#3b82f6' },
                      { name: 'Operating Expenses', value: -operatingExpenses, fill: '#f59e0b' },
                      { name: 'Net Profit', value: netProfit, fill: netProfit >= 0 ? '#10b981' : '#ef4444' }
                    ]
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(Math.abs(value))]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {[0, 1, 2, 3, 4].map((index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ef4444' : index === 2 ? '#3b82f6' : index === 3 ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  💧 <strong>What this shows:</strong> Waterfall shows how revenue flows into profit. 
                  Green bars = money in, Red/Orange = money out. Final bar shows net profit after all costs.
                </p>
              </CardContent>
            </Card>

            {/* Product Distribution Heatmap (Scatter) */}
            <Card>
              <CardHeader>
                <CardTitle>Product Value vs Volume Matrix</CardTitle>
                <CardDescription>Identify high-value, high-volume products</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      dataKey="volume" 
                      name="Volume" 
                      label={{ value: 'Units Sold', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="value" 
                      name="Value" 
                      label={{ value: 'Revenue (Rs)', angle: -90, position: 'insideLeft' }}
                    />
                    <ZAxis type="number" dataKey="profit" range={[50, 400]} name="Profit" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Volume') return [value + ' units', 'Units Sold']
                        if (name === 'Value') return [formatCurrency(value), 'Revenue']
                        return [formatCurrency(value), 'Profit']
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Scatter 
                      name="Products" 
                      data={(() => {
                        return profitabilityData
                          .filter(p => p.revenue > 0)
                          .slice(0, 15)
                          .map(p => ({
                            volume: p.revenue / (p.revenue / Math.max(1, p.profit)), // Estimate volume
                            value: p.revenue,
                            profit: p.profit,
                            name: p.name
                          }))
                      })()} 
                      fill="#8b5cf6" 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  🎯 <strong>What this shows:</strong> Each dot is a product. Top-right = high value & high volume (STARS ⭐). 
                  Bottom-left = low performers. Bubble size = profit amount.
                </p>
              </CardContent>
            </Card>

            {/* Revenue Concentration Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Concentration (Pareto)</CardTitle>
                <CardDescription>80/20 rule - Which products drive most revenue?</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={(() => {
                    const sorted = [...profitabilityData]
                      .filter(p => p.revenue > 0)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 10)
                    
                    const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0)
                    let cumulative = 0
                    
                    return sorted.map((product, index) => {
                      cumulative += product.revenue
                      return {
                        name: product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name,
                        revenue: product.revenue,
                        cumulative: (cumulative / totalRevenue * 100).toFixed(1),
                        index: index + 1
                      }
                    })
                  })()}>
                    <defs>
                      <linearGradient id="paretoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" label={{ value: 'Revenue (Rs)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                        return [value + '%', 'Cumulative %']
                      }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="url(#paretoGradient)" name="Revenue" radius={[8, 8, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={3} name="Cumulative %" dot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="text-xs text-slate-600 mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  📊 <strong>What this shows:</strong> Pareto (80/20) analysis. Often 20% of products generate 80% of revenue. 
                  Purple bars = individual revenue, Red line = cumulative %. Focus on products before line hits 80%.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* END: Content to be exported as PDF */}
    </div>
  )
}
