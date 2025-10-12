"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Plus,
  QrCode,
  Calendar,
  Factory,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  LayoutDashboard,
  Box,
  Boxes,
  PackageCheck,
  FileText,
  Menu,
  X,
  Wallet,
} from "lucide-react"
import { InventoryTable } from "@/components/inventory-table"
import { AddItemDialog } from "@/components/add-item-dialog"
import { DistributionTable } from "@/components/distribution-table"
import { FinancialOverview } from "@/components/financial-overview"
import { MonthlyReports } from "@/components/monthly-reports"
import { BarcodeScannerDialog } from "@/components/barcode-scanner-dialog"
import { ProductionAccounting } from "@/components/production-accounting"
import { ProductsManagement } from "@/components/products-management" // Added ProductsManagement component
import { AnalyticsDashboard } from "@/components/analytics-dashboard" // Added AnalyticsDashboard component
import { ImportProductionDialog } from "@/components/import-production-dialog" // Added ImportProductionDialog component
import { RecoveryManagement } from "@/components/recovery-management" // Added RecoveryManagement component

interface Product {
  id: string
  name: string
  type: string
  description: string
  ideaCreationDate: string
  productionStartDate: string
  additionalInfo: string
  isActive: boolean
  createdDate: string
}

interface InventoryItem {
  id: string
  name: string
  item_type: "raw_material" | "finished_product"
  quantity: number
  unit_cost: number
  selling_price?: number
  location: string
  notes: string
  supplier?: string
  barcode?: string
  current_stock: number
  minimum_stock?: number
  last_updated?: string
}

interface Distribution {
  id: string | number
  inventory_item_id?: number
  recipient_name?: string
  recipient_contact?: string
  recipient?: string
  recipientType?: "distributor" | "shop_keeper" | "individual" | "friend_family" | "influencer_marketing"
  location?: string
  personName?: string
  phoneNumber?: string
  cnic?: string
  items?: {
    itemId: string
    itemName: string
    quantity: number
    unitCost: number
    sellingPrice: number
    batchId?: string
    batchName?: string
  }[]
  quantity?: number
  unit_price?: number
  total_amount?: number
  totalValue?: number
  totalProfit?: number
  gross_profit?: number
  date?: string
  distribution_date?: string
  status?: "pending" | "completed" | "cancelled"
  month?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface ProductionBatch {
  id: string | number
  batchName?: string
  batch_number?: string
  productId?: string | number
  product_id?: string | number
  productName?: string
  product_name?: string
  unitsProduced?: number
  quantityProduced?: number
  quantity_produced?: number
  quantity_remaining?: number
  rejected_units?: number
  productionDate?: string
  production_date?: string
  month?: string
  rawMaterials?: { itemId: string; itemName: string; quantity: number; unitCost: number }[]
  fixedCosts?: {
    labor: number
    electricity: number
    packing: number
    advertising: number
  }
  miscellaneousCosts?: { description: string; amount: number }[]
  totalRawMaterialCost?: number
  totalFixedCosts?: number
  totalMiscellaneousCosts?: number
  totalCost?: number
  costPerUnit?: number
  cost_per_unit?: number
}

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showScannerDialog, setShowScannerDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [showLeaderboard, setShowLeaderboard] = useState(false) // Added state to control leaderboard view
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview") // Added state for active tab
  const [sidebarOpen, setSidebarOpen] = useState(false) // Added state for mobile sidebar
  const [recoverySummary, setRecoverySummary] = useState<any>(null) // Added state for recovery summary

  useEffect(() => {
    loadData()
  }, [])

  // Reload data whenever tab changes for real-time updates
  useEffect(() => {
    if (activeTab !== "overview") {
      loadData()
    }
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [inventoryRes, productsRes, distributionsRes, productionBatchesRes, recoveryRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/products"),
        fetch("/api/distributions"),
        fetch("/api/production-batches"),
        fetch("/api/recovery-summary"),
      ])

      if (!inventoryRes.ok || !productsRes.ok || !distributionsRes.ok || !productionBatchesRes.ok) {
        throw new Error("Failed to load data from database")
      }

      const inventoryData = await inventoryRes.json()
      const productsData = await productsRes.json()
      const distributionsData = await distributionsRes.json()
      const productionBatchesData = await productionBatchesRes.json()
      const recoveryData = recoveryRes.ok ? await recoveryRes.json() : null

      if (inventoryData.requiresSetup || productsData.requiresSetup || distributionsData.requiresSetup) {
        setError("Database setup required. Please run the setup scripts first.")
        setLoading(false)
        return
      }

      setInventory(inventoryData.data || [])
      setProducts(productsData.data || [])
      
      // Calculate profit for distributions
      const distributionsWithProfit = (distributionsData.data || []).map((dist: any) => {
        const inventoryItem = (inventoryData.data || []).find((inv: any) => inv.id === dist.inventory_item_id)
        const costPrice = inventoryItem?.unit_cost || 0
        const unitPrice = dist.unit_price || 0
        const quantity = dist.quantity || 0
        
        const costOfGoodsSold = costPrice * quantity
        const totalValue = unitPrice * quantity
        const grossProfit = totalValue - costOfGoodsSold
        const profitMarginPercent = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0
        
        return {
          ...dist,
          cost_price: costPrice,
          cost_of_goods_sold: costOfGoodsSold,
          gross_profit: grossProfit,
          profit_margin_percent: profitMarginPercent,
          total_amount: totalValue
        }
      })
      
      setDistributions(distributionsWithProfit)
      setProductionBatches(productionBatchesData.data || [])
      setRecoverySummary(recoveryData?.data || null)
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to connect to database. Please check your database connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredDistributions = distributions.filter((d) => {
    if (!d.distribution_date) return false
    const distributionMonth = new Date(d.distribution_date).toISOString().slice(0, 7)
    return distributionMonth === selectedMonth
  })

  const filteredBatches = productionBatches.filter((batch) => {
    const batchDate = batch.productionDate || batch.production_date
    if (!batchDate) return false
    const batchMonth = new Date(batchDate).toISOString().slice(0, 7)
    return batchMonth === selectedMonth
  })

  // Calculate dashboard metrics
  const totalProducts = products.length // Total number of product types
  const lowStockItems = inventory.filter((item) => item.quantity <= (item.minimum_stock || 0))
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
  
  // Calculate monthly distribution metrics
  const monthlyDistributionValue = filteredDistributions.reduce((sum, d) => sum + (d.total_amount || d.totalValue || 0), 0)
  const monthlyDistributionProfit = filteredDistributions.reduce((sum, d) => sum + (d.gross_profit || 0), 0)
  const totalBatchesProduced = filteredBatches.length
  const completedOrders = filteredDistributions.filter((d) => d.status === "completed" || !d.status).length
  const pendingDistributions = filteredDistributions.filter((d) => d.status === "pending").length
  const avgOrderValue = filteredDistributions.length > 0 
    ? monthlyDistributionValue / filteredDistributions.length 
    : 0

  // Production success metrics
  const totalProduced = filteredBatches.reduce((sum, batch) => sum + (batch.quantityProduced || batch.quantity_produced || 0), 0)
  const totalRejected = filteredBatches.reduce((sum, batch) => sum + (batch.rejected_units || 0), 0)
  const successRate = totalProduced > 0 ? (((totalProduced - totalRejected) / totalProduced) * 100).toFixed(1) : "0"

  const addInventoryItem = async (item: Omit<InventoryItem, "id" | "lastUpdated">) => {
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      })

      if (!response.ok) throw new Error("Failed to add inventory item")

      const result = await response.json()
      const newItem = result.data

      setInventory((prev) => [...prev, newItem])
    } catch (error) {
      console.error("Error adding inventory item:", error)
      setError("Failed to add inventory item. Please try again.")
    }
  }

  const handleBarcodeScanned = async (barcode: string) => {
    const existingItem = inventory.find((item) => item.barcode === barcode)
    if (existingItem) {
      // Update quantity of existing item
      try {
        const response = await fetch(`/api/inventory/${existingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: existingItem.quantity + 1 }),
        })

        if (response.ok) {
          const result = await response.json()
          setInventory((prev) => prev.map((item) => (item.id === existingItem.id ? result.data : item)))
        }
      } catch (error) {
        console.error("Error updating inventory:", error)
      }
    } else {
      setShowAddDialog(true)
    }
    setShowScannerDialog(false)
  }

  const handleBatchCreated = async (batch: ProductionBatch) => {
    // Reload all data from API after batch creation
    // The production batch API should have already saved the batch
    // and the component should have already updated raw material inventory
    await loadData()
  }

  const handleDistributionCreated = async (distribution: Distribution) => {
    // Reload all data to ensure inventory quantities are updated in real-time
    await loadData()
    
    // Only process if items exist (legacy format)
    if (!distribution.items || distribution.items.length === 0) {
      return
    }
    
    // Calculate profit for each item
    const distributionWithProfit = {
      ...distribution,
      items: distribution.items.map((item) => {
        const inventoryItem = inventory.find((inv) => inv.id === item.itemId)
        const profit = item.sellingPrice - (inventoryItem?.unit_cost || 0)
        return { ...item, profit }
      }),
      totalProfit: distribution.items.reduce((sum, item) => {
        const inventoryItem = inventory.find((inv) => inv.id === item.itemId)
        return sum + (item.sellingPrice - (inventoryItem?.unit_cost || 0)) * item.quantity
      }, 0),
    }

    // Update distributions
    const updatedDistributions = [...distributions, distributionWithProfit]
    setDistributions(updatedDistributions)
    localStorage.setItem("distributions", JSON.stringify(updatedDistributions))

    // Deduct items from inventory
    const updatedInventory = inventory.map((item) => {
      const distributedItem = distribution.items?.find((di) => di.itemId === item.id)
      if (distributedItem) {
        return {
          ...item,
          quantity: Math.max(0, item.quantity - distributedItem.quantity),
          lastUpdated: new Date().toISOString(),
        }
      }
      return item
    })

    setInventory(updatedInventory)
    localStorage.setItem("inventory", JSON.stringify(updatedInventory))
  }

  const finishedProducts = inventory.filter((item) => item.item_type === "finished_product")
  const rawMaterials = inventory.filter((item) => item.item_type === "raw_material")

  const addProduct = async (product: Omit<Product, "id" | "createdDate">) => {
    try {
      // Ensure numeric fields are numbers
      const payload = {
        ...product,
        unit_price: Number((product as any).unit_price),
        cost_price: Number((product as any).cost_price),
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let body: any = null
        try {
          body = await response.json()
        } catch (e) {
          // ignore
        }
        console.error("Create product failed", response.status, body)
        throw new Error(body?.error || "Failed to add product")
      }

      const result = await response.json()
      setProducts((prev) => [...prev, result.data])
    } catch (error) {
      console.error("Error adding product:", error)
      setError("Failed to add product. See console for details.")
    }
  }

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const result = await response.json()
        // Compare string versions to handle both string and number IDs
        setProducts((prev) => prev.map((p) => (String(p.id) === String(productId) ? result.data : p)))
      }
    } catch (error) {
      console.error("Error updating product:", error)
    }
  }

  const deleteProduct = async (productId: string) => {
    console.log('[Product Delete] Attempting to delete product:', productId, typeof productId)
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      console.log('[Product Delete] Response status:', response.status, response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log('[Product Delete] API result:', result)
        
        if (result.success) {
          // Filter by comparing string versions to handle both string and number ids
          setProducts((prev) => prev.filter((p) => String(p.id) !== String(productId)))
          console.log("Product deleted successfully")
        } else {
          console.error("Failed to delete product:", result.error)
          alert("Failed to delete product: " + result.error)
        }
      } else {
        const errorText = await response.text()
        console.error("Delete request failed:", response.status, response.statusText, errorText)
        alert("Failed to delete product. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("Error deleting product. Please check your connection.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading inventory system...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Database Connection Issue</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showLeaderboard && (
                <Button variant="outline" onClick={() => setShowLeaderboard(false)} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {showLeaderboard ? "Sales Analytics & Leaderboard" : "dekord's "}
                </h1>
                <p className="text-slate-600">
                  {showLeaderboard
                    ? "Comprehensive sales performance and analytics dashboard"
                    : "Stock & Manufacturing Inventory System"}
                </p>
              </div>
            </div>
            {!showLeaderboard && (
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>
                <Button onClick={() => setShowScannerDialog(true)} variant="outline">
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {showLeaderboard ? (
          <AnalyticsDashboard open={true} onOpenChange={() => {}} distributions={distributions} />
        ) : (
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sticky top-6">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "overview"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Overview</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("products")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "products"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Box className="w-5 h-5" />
                    <span>Products</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("raw-materials")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "raw-materials"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Boxes className="w-5 h-5" />
                    <span>Raw Materials</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("production")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "production"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Factory className="w-5 h-5" />
                    <span>Production</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ready")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "ready"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <PackageCheck className="w-5 h-5" />
                    <span>Ready</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("distributions")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "distributions"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Distributions</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("recovery")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "recovery"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Recovery</span>
                  </button>


                  <button
                    onClick={() => setActiveTab("financial")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "financial"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Financial</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeTab === "reports"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span>Reports</span>
                  </button>

                  
                </nav>
              </div>
            </aside>

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Mobile Sidebar */}
            <aside
              className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform duration-300 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-lg text-slate-900">Navigation</h2>
              </div>
              <nav className="p-4 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("overview")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "overview"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("products")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "products"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Box className="w-5 h-5" />
                  <span>Products</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("raw-materials")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "raw-materials"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Boxes className="w-5 h-5" />
                  <span>Raw Materials</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("production")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "production"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Factory className="w-5 h-5" />
                  <span>Production</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("ready")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "ready"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>Ready</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("distributions")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "distributions"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Distributions</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("financial")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "financial"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Financial</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("reports")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "reports"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Reports</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("recovery")
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "recovery"
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                  <span>Recovery</span>
                </button>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {activeTab === "overview" && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Monthly Overview -{" "}
                      {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h2>
                  </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{totalProducts}</div>
                    <p className="text-xs text-slate-500">Product types</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Low Stock Alerts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{lowStockItems.length}</div>
                    <p className="text-xs text-slate-500">Items need restocking</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Monthly Distributions</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      Rs {monthlyDistributionValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500">Total distributed value</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Production Batches</CardTitle>
                    <Factory className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{totalBatchesProduced}</div>
                    <p className="text-xs text-slate-500">Batches this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Recovered</CardTitle>
                    <Wallet className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      Rs {(recoverySummary?.totalRecovered || 0).toLocaleString()}
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
                    <div className="text-2xl font-bold text-slate-900">
                      Rs {(recoverySummary?.totalOutstanding || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500">Pending payments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Recovery Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {(recoverySummary?.recoveryRate || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-500">Collection efficiency</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Ready Products Inventory
                    </CardTitle>
                    <CardDescription>Stock levels by product</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {finishedProducts.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">No ready products yet</p>
                      ) : (
                        finishedProducts.map((item, index) => {
                          const totalInventory = finishedProducts.reduce((sum, p) => sum + p.quantity, 0)
                          const percentage = totalInventory > 0 ? (item.quantity / totalInventory) * 100 : 0
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{item.name}</span>
                                <span className="text-sm text-slate-600">{item.quantity} units</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Monthly Performance
                    </CardTitle>
                    <CardDescription>Key metrics for this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Batches Produced</span>
                        <span className="text-lg font-bold text-blue-600">{totalBatchesProduced}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Distributions</span>
                        <span className="text-lg font-bold text-purple-600">{filteredDistributions.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Profit</span>
                        <span className="text-lg font-bold text-green-600">
                          Rs {monthlyDistributionProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      Finished Products
                    </CardTitle>
                    <CardDescription>Ready-to-sell products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {finishedProducts.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">
                        No finished products yet. Import from production batches to add products here.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {finishedProducts.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.barcode}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{item.quantity} units</p>
                              <p className="text-xs text-slate-500">${item.selling_price?.toFixed(2) || "0.00"}/unit</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      Production Batches
                    </CardTitle>
                    <CardDescription>Quality control and success metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredBatches.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">
                        No production batches this month
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{totalBatchesProduced}</p>
                            <p className="text-xs text-slate-600">Total Batches</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{totalProduced - totalRejected}</p>
                            <p className="text-xs text-slate-600">Accepted Units</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-2xl font-bold text-amber-600">{totalRejected}</p>
                            <p className="text-xs text-slate-600">Rejected Units</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Success Rate</span>
                            <span className="text-lg font-bold text-green-600">{successRate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                              className="bg-green-600 h-3 rounded-full transition-all"
                              style={{ width: `${successRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {filteredBatches.slice(0, 5).map((batch, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border-l-4 border-blue-500 bg-slate-50 rounded">
                              <div>
                                <p className="text-sm font-medium">{(batch as any).productName || (batch as any).product_name}</p>
                                <p className="text-xs text-slate-500">{(batch as any).batchNumber || (batch as any).batch_number}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">{(batch as any).quantityProduced || (batch as any).quantity_produced} units</p>
                                <p className="text-xs text-slate-500">
                                  {new Date((batch as any).productionDate || (batch as any).production_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
                </div>
              )}

              {activeTab === "products" && (
                <ProductsManagement
                  products={products}
                  onAddProduct={addProduct}
                  onUpdateProduct={updateProduct}
                  onDeleteProduct={deleteProduct}
                />
              )}

              {activeTab === "raw-materials" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Raw Materials Management</h2>
                    <p className="text-slate-600">Manage raw materials and components for production</p>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Raw Material
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      Raw Materials Inventory
                    </CardTitle>
                    <CardDescription>Manufacturing components and supplies with pricing details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InventoryTable
                      inventory={rawMaterials}
                      setInventory={setInventory}
                      showTypeFilter={false}
                      inventoryType="raw"
                    />
                  </CardContent>
                </Card>
              </div>
              )}

              {activeTab === "ready" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Ready Products</h2>
                      <p className="text-slate-600">Finished products ready for distribution</p>
                    </div>
                    <Button onClick={() => setShowImportDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Package className="w-4 h-4 mr-2" />
                      Import from Production
                    </Button>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                        Finished Products Ready for Distribution
                      </CardTitle>
                      <CardDescription>Products completed from production batches and ready to sell</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <InventoryTable
                        inventory={finishedProducts}
                        setInventory={setInventory}
                        showTypeFilter={false}
                        inventoryType="finished"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "distributions" && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribution Management</CardTitle>
                  <CardDescription>
                    Track goods distributed to customers and partners for{" "}
                    {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DistributionTable
                    distributions={filteredDistributions}
                    setDistributions={setDistributions}
                    inventory={inventory}
                    selectedMonth={selectedMonth}
                    productionBatches={productionBatches}
                    onDistributionCreated={handleDistributionCreated}
                    onShowLeaderboard={() => setShowLeaderboard(true)} // Pass leaderboard handler to distribution table
                  />
                </CardContent>
              </Card>
              )}

              {activeTab === "production" && (
                <ProductionAccounting
                  inventory={inventory}
                  products={products}
                  selectedMonth={selectedMonth}
                  onBatchCreated={handleBatchCreated}
                  productionBatches={productionBatches}
                />
              )}

              {activeTab === "financial" && (
                <FinancialOverview
                  inventory={inventory}
                  distributions={filteredDistributions}
                  selectedMonth={selectedMonth}
                  productionBatches={productionBatches}
                  recoverySummary={recoverySummary}
                />
              )}

              {activeTab === "reports" && (
                <MonthlyReports
                  selectedMonth={selectedMonth}
                  recoverySummary={recoverySummary}
                />
              )}

              {activeTab === "recovery" && <RecoveryManagement distributions={distributions} />}
            </div>
          </div>
        )}
      </div>

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadData} // Reload data after adding item
        products={products} // Pass products to add item dialog
        productionBatches={productionBatches} // Pass production batches to add item dialog
      />
      <BarcodeScannerDialog
        open={showScannerDialog}
        onOpenChange={setShowScannerDialog}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <ImportProductionDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onSuccess={loadData} // Reload data after importing production
      />
    </div>
  )
}
