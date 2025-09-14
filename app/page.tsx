"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  productionDate?: string
  productId?: string // Added product linking
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
  productId: string // Changed from productName to productId for proper linking
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

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showScannerDialog, setShowScannerDialog] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [showLeaderboard, setShowLeaderboard] = useState(false) // Added state to control leaderboard view
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [inventoryRes, productsRes, distributionsRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/products"),
        fetch("/api/distributions"),
      ])

      if (!inventoryRes.ok || !productsRes.ok || !distributionsRes.ok) {
        throw new Error("Failed to load data from database")
      }

      const inventoryData = await inventoryRes.json()
      const productsData = await productsRes.json()
      const distributionsData = await distributionsRes.json()

      if (inventoryData.requiresSetup || productsData.requiresSetup || distributionsData.requiresSetup) {
        setError("Database setup required. Please run the setup scripts first.")
        setLoading(false)
        return
      }

      setInventory(inventoryData.data || [])
      setProducts(productsData.data || [])
      setDistributions(distributionsData.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
      setError("Failed to connect to database. Please check your database connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredDistributions = distributions.filter((d) => d.month === selectedMonth)

  // Calculate dashboard metrics
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minStock)
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const pendingDistributions = filteredDistributions.filter((d) => d.status === "pending").length

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

  const handleBatchCreated = (batch: ProductionBatch) => {
    // Add batch to production batches
    const updatedBatches = [...productionBatches, batch]
    setProductionBatches(updatedBatches)
    localStorage.setItem("productionBatches", JSON.stringify(updatedBatches))

    // Deduct raw materials from inventory
    const updatedInventory = inventory.map((item) => {
      const usedMaterial = batch.rawMaterials.find((rm) => rm.itemId === item.id)
      if (usedMaterial && item.inventoryType === "raw") {
        return {
          ...item,
          quantity: Math.max(0, item.quantity - usedMaterial.quantity),
          lastUpdated: new Date().toISOString(),
        }
      }
      return item
    })

    // Add finished products to inventory
    const finishedProduct: InventoryItem = {
      id: `batch-${batch.id}-product`,
      name: batch.productName,
      sku: `BATCH-${batch.batchName}`,
      category: "Finished Products",
      inventoryType: "finished",
      quantity: batch.unitsProduced,
      minStock: 10,
      unitCost: batch.costPerUnit,
      sellingPrice: batch.costPerUnit * 1.3,
      supplier: "Internal Production",
      lastUpdated: new Date().toISOString(),
      batchId: batch.id,
      batchName: batch.batchName,
      productionDate: batch.productionDate,
      productId: batch.productId,
    }

    const finalInventory = [...updatedInventory, finishedProduct]
    setInventory(finalInventory)
    localStorage.setItem("inventory", JSON.stringify(finalInventory))
  }

  const handleDistributionCreated = (distribution: Distribution) => {
    // Calculate profit for each item
    const distributionWithProfit = {
      ...distribution,
      items: distribution.items.map((item) => {
        const inventoryItem = inventory.find((inv) => inv.id === item.itemId)
        const profit = item.sellingPrice - (inventoryItem?.unitCost || 0)
        return { ...item, profit }
      }),
      totalProfit: distribution.items.reduce((sum, item) => {
        const inventoryItem = inventory.find((inv) => inv.id === item.itemId)
        return sum + (item.sellingPrice - (inventoryItem?.unitCost || 0)) * item.quantity
      }, 0),
    }

    // Update distributions
    const updatedDistributions = [...distributions, distributionWithProfit]
    setDistributions(updatedDistributions)
    localStorage.setItem("distributions", JSON.stringify(updatedDistributions))

    // Deduct items from inventory
    const updatedInventory = inventory.map((item) => {
      const distributedItem = distribution.items.find((di) => di.itemId === item.id)
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

  const finishedProducts = inventory.filter((item) => item.inventoryType === "finished")
  const rawMaterials = inventory.filter((item) => item.inventoryType === "raw")

  const addProduct = async (product: Omit<Product, "id" | "createdDate">) => {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      })

      if (!response.ok) throw new Error("Failed to add product")

      const result = await response.json()
      setProducts((prev) => [...prev, result.data])
    } catch (error) {
      console.error("Error adding product:", error)
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
        setProducts((prev) => prev.map((p) => (p.id === productId ? result.data : p)))
      }
    } catch (error) {
      console.error("Error updating product:", error)
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
      }
    } catch (error) {
      console.error("Error deleting product:", error)
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
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="distributions">Distributions</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Monthly Overview -{" "}
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
                    <Package className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{totalItems.toLocaleString()}</div>
                    <p className="text-xs text-slate-500">Units in stock</p>
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
                      ${filteredDistributions.reduce((sum, d) => sum + d.totalValue, 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500">This month's value</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      Pending Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{pendingDistributions}</div>
                    <p className="text-xs text-slate-500">Awaiting fulfillment</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Inventory Distribution
                    </CardTitle>
                    <CardDescription>Stock levels by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Finished Products</span>
                        <span className="text-sm text-slate-600">
                          {finishedProducts.reduce((sum, item) => sum + item.quantity, 0)} units
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(finishedProducts.reduce((sum, item) => sum + item.quantity, 0) / totalItems) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Raw Materials</span>
                        <span className="text-sm text-slate-600">
                          {rawMaterials.reduce((sum, item) => sum + item.quantity, 0)} units
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(rawMaterials.reduce((sum, item) => sum + item.quantity, 0) / totalItems) * 100}%`,
                          }}
                        ></div>
                      </div>
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
                        <span className="text-sm font-medium">Total Inventory Value</span>
                        <span className="text-lg font-bold text-green-600">${totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Completed Orders</span>
                        <span className="text-lg font-bold text-blue-600">
                          {filteredDistributions.filter((d) => d.status === "completed").length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average Order Value</span>
                        <span className="text-lg font-bold text-purple-600">
                          $
                          {filteredDistributions.length > 0
                            ? (
                                filteredDistributions.reduce((sum, d) => sum + d.totalValue, 0) /
                                filteredDistributions.length
                              ).toLocaleString()
                            : "0"}
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
                    <CardDescription>Ready-to-sell cable products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InventoryTable
                      inventory={finishedProducts}
                      setInventory={setInventory}
                      showTypeFilter={false}
                      compact={true}
                    />
                  </CardContent>
                </Card>

                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      Raw Materials
                    </CardTitle>
                    <CardDescription>Manufacturing components and supplies</CardDescription>
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
            </TabsContent>

            <TabsContent value="products">
              <ProductsManagement
                products={products}
                onAddProduct={addProduct}
                onUpdateProduct={updateProduct}
                onDeleteProduct={deleteProduct}
              />
            </TabsContent>

            <TabsContent value="inventory">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Inventory Management</h2>
                    <p className="text-slate-600">Manage your finished products and raw materials</p>
                  </div>
                  <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                        Finished Products
                      </CardTitle>
                      <CardDescription>Ready-to-sell cable products with cost and pricing</CardDescription>
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Factory className="h-5 w-5 text-blue-600" />
                        Raw Materials
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
              </div>
            </TabsContent>

            <TabsContent value="distributions">
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
            </TabsContent>

            <TabsContent value="production">
              <ProductionAccounting
                inventory={inventory}
                products={products}
                selectedMonth={selectedMonth}
                onBatchCreated={handleBatchCreated}
                productionBatches={productionBatches}
              />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialOverview
                inventory={inventory}
                distributions={filteredDistributions}
                selectedMonth={selectedMonth}
                productionBatches={productionBatches}
              />
            </TabsContent>

            <TabsContent value="reports">
              <MonthlyReports
                inventory={inventory}
                distributions={distributions}
                selectedMonth={selectedMonth}
                productionBatches={productionBatches}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddItem={addInventoryItem}
        products={products} // Pass products to add item dialog
        productionBatches={productionBatches} // Pass production batches to add item dialog
      />
      <BarcodeScannerDialog
        open={showScannerDialog}
        onOpenChange={setShowScannerDialog}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </div>
  )
}
