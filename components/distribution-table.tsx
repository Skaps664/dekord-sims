"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, TrendingUp, BarChart3, Loader2 } from "lucide-react"
import { formatCurrency, formatNumber, formatDate } from "@/lib/api-helpers"

interface Product {
  product_id: number
  product_name: string
  category: string
  unit_price: number
  cost_price: number
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  location: string
  stock_status: string
  inventory_value: number
  last_updated: string
  barcode?: string
}

interface Distribution {
  id: number
  product_id: number
  product_name: string
  recipient_name: string
  recipient_contact?: string
  quantity: number
  distribution_date: string
  unit_price: number
  total_value: number
  status: string
  notes?: string
  cost_price: number
  cost_of_goods_sold: number
  gross_profit: number
  profit_margin_percent: number
}

interface DistributionTableProps {
  selectedMonth: string
  onShowLeaderboard?: () => void
  onRefresh?: () => void
}

export function DistributionTable({ selectedMonth, onShowLeaderboard, onRefresh }: DistributionTableProps) {
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)

  const [newDistribution, setNewDistribution] = useState({
    product_id: "",
    recipient_name: "",
    recipient_contact: "",
    quantity: 0,
    distribution_date: formatDate(new Date()),
    unit_price: 0,
    notes: "",
  })

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [distributionsRes, inventoryRes] = await Promise.all([
        fetch("/api/distributions"),
        fetch("/api/inventory"),
      ])

      const [distributionsResult, inventoryResult] = await Promise.all([distributionsRes.json(), inventoryRes.json()])

      if (distributionsResult.success) {
        // Map distributions and calculate profit metrics
        const mappedDistributions = distributionsResult.data.map((dist: any) => {
          // Find the product to get cost_price
          const product = inventoryResult.success 
            ? inventoryResult.data.find((inv: any) => inv.id === dist.inventory_item_id)
            : null
          
          const costPrice = product?.unit_cost || 0
          const unitPrice = dist.unit_price || 0
          const quantity = dist.quantity || 0
          
          const costOfGoodsSold = costPrice * quantity
          const totalValue = unitPrice * quantity
          const grossProfit = totalValue - costOfGoodsSold
          const profitMarginPercent = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0
          
          return {
            id: dist.id,
            product_id: dist.inventory_item_id,
            product_name: product?.name || 'Unknown Product',
            recipient_name: dist.recipient_name,
            recipient_contact: dist.recipient_contact,
            quantity: quantity,
            distribution_date: dist.distribution_date,
            unit_price: unitPrice,
            total_value: totalValue,
            status: dist.status || 'completed',
            notes: dist.notes,
            cost_price: costPrice,
            cost_of_goods_sold: costOfGoodsSold,
            gross_profit: grossProfit,
            profit_margin_percent: profitMarginPercent
          }
        })
        setDistributions(mappedDistributions)
      }
      if (inventoryResult.success) {
        // Filter only finished products with stock > 0 for distribution
        const availableProducts = inventoryResult.data
          .filter((item: any) => 
            item.item_type === 'finished_product' && item.quantity > 0
          )
          .map((item: any) => ({
            product_id: item.id,
            product_name: item.name,
            category: item.category || 'Finished Product',
            unit_price: item.selling_price || item.unit_cost || 0,
            cost_price: item.unit_cost || 0,
            current_stock: item.quantity || 0, // quantity is the current available stock after distributions
            minimum_stock: item.minimum_stock || 0,
            maximum_stock: item.maximum_stock || 0,
            location: item.location || 'Warehouse',
            stock_status: item.quantity > (item.minimum_stock || 0) ? 'In Stock' : 'Low Stock',
            inventory_value: item.quantity * (item.unit_cost || 0),
            last_updated: item.last_updated || item.updatedAt,
            barcode: item.barcode
          }))
        setProducts(availableProducts)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter distributions by selected month
  const filteredDistributions = Array.isArray(distributions) ? distributions.filter((dist) => {
    const distDate = new Date(dist.distribution_date)
    const selectedDate = new Date(selectedMonth + "-01")
    const matchesMonth =
      distDate.getFullYear() === selectedDate.getFullYear() && distDate.getMonth() === selectedDate.getMonth()
    const matchesSearch = (dist.recipient_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchesMonth && matchesSearch
  }) : []

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.product_id === Number.parseInt(productId))
    if (product) {
      setSelectedProduct(product)
      setNewDistribution({
        ...newDistribution,
        product_id: productId,
        unit_price: product.unit_price, // Default to product's selling price
      })
    }
  }

  const addDistribution = async () => {
    if (
      !newDistribution.product_id ||
      !newDistribution.recipient_name ||
      newDistribution.quantity <= 0 ||
      newDistribution.unit_price <= 0
    ) {
      alert("Please fill in all required fields")
      return
    }

    if (selectedProduct && newDistribution.quantity > selectedProduct.current_stock) {
      alert(`Insufficient stock. Available: ${selectedProduct.current_stock}`)
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/distributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventory_item_id: newDistribution.product_id,
          recipient_name: newDistribution.recipient_name,
          recipient_contact: newDistribution.recipient_contact || null,
          quantity: newDistribution.quantity,
          distribution_date: newDistribution.distribution_date,
          unit_price: newDistribution.unit_price,
          notes: newDistribution.notes || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setNewDistribution({
          product_id: "",
          recipient_name: "",
          recipient_contact: "",
          quantity: 0,
          distribution_date: formatDate(new Date()),
          unit_price: 0,
          notes: "",
        })
        setSelectedProduct(null)
        setShowAddDialog(false)
        await fetchData() // Refresh data
        onRefresh?.()
      } else {
        console.error("Failed to create distribution:", result.error)
        alert("Failed to create distribution: " + result.error)
      }
    } catch (error) {
      console.error("Error creating distribution:", error)
      alert("Error creating distribution. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toString().toLowerCase()
    switch (s) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            Completed
          </Badge>
        )
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading distribution data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search distributions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onShowLeaderboard}
            variant="outline"
            className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Leaderboard
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Distribution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Distribution</DialogTitle>
                <DialogDescription>
                  Distribute products to customers, distributors, or other recipients. Inventory will be automatically
                  updated.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Product Selection */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Product Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="product">Select Product *</Label>
                      <Select value={newDistribution.product_id} onValueChange={handleProductSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a product from inventory" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.product_id} value={product.product_id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{product.product_name}</span>
                                <span className="text-xs text-slate-500">
                                  Stock: {formatNumber(product.current_stock)} | Price:{" "}
                                  {formatCurrency(product.unit_price)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={newDistribution.quantity}
                        onChange={(e) =>
                          setNewDistribution({ ...newDistribution, quantity: Number.parseFloat(e.target.value) || 0 })
                        }
                        max={selectedProduct?.current_stock || 0}
                        placeholder="0"
                      />
                      {selectedProduct && (
                        <p className="text-xs text-slate-500">
                          Available: {formatNumber(selectedProduct.current_stock)}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <h4 className="font-medium text-slate-900 mb-2">Product Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Category:</span>
                          <p className="font-medium">{selectedProduct.category || "Uncategorized"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Cost Price:</span>
                          <p className="font-medium">{formatCurrency(selectedProduct.cost_price)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Selling Price:</span>
                          <p className="font-medium">{formatCurrency(selectedProduct.unit_price)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Location:</span>
                          <p className="font-medium">{selectedProduct.location || "Not specified"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recipient Information */}
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Recipient Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="recipient_name">Recipient Name *</Label>
                      <Input
                        id="recipient_name"
                        value={newDistribution.recipient_name}
                        onChange={(e) => setNewDistribution({ ...newDistribution, recipient_name: e.target.value })}
                        placeholder="Company or person name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recipient_contact">Contact Information</Label>
                      <Input
                        id="recipient_contact"
                        value={newDistribution.recipient_contact}
                        onChange={(e) => setNewDistribution({ ...newDistribution, recipient_contact: e.target.value })}
                        placeholder="Phone, email, or address"
                      />
                    </div>
                  </div>
                </div>

                {/* Distribution Details */}
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Distribution Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="unit_price">Unit Price *</Label>
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.01"
                        value={newDistribution.unit_price}
                        onChange={(e) =>
                          setNewDistribution({ ...newDistribution, unit_price: Number.parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="distribution_date">Distribution Date</Label>
                      <Input
                        id="distribution_date"
                        type="date"
                        value={newDistribution.distribution_date}
                        onChange={(e) => setNewDistribution({ ...newDistribution, distribution_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newDistribution.notes}
                      onChange={(e) => setNewDistribution({ ...newDistribution, notes: e.target.value })}
                      placeholder="Additional notes about this distribution..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Profit Calculation */}
                {selectedProduct && newDistribution.quantity > 0 && newDistribution.unit_price > 0 && (
                  <div className="bg-slate-100 p-6 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Financial Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-slate-500 text-sm">Total Revenue:</span>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(newDistribution.quantity * newDistribution.unit_price)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Total Cost:</span>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(newDistribution.quantity * selectedProduct.cost_price)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Gross Profit:</span>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(
                            newDistribution.quantity * (newDistribution.unit_price - selectedProduct.cost_price),
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Profit Margin:</span>
                        <p className="text-xl font-bold text-purple-600">
                          {(
                            ((newDistribution.unit_price - selectedProduct.cost_price) / newDistribution.unit_price) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-6">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={addDistribution}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    saving ||
                    !newDistribution.product_id ||
                    !newDistribution.recipient_name ||
                    newDistribution.quantity <= 0 ||
                    newDistribution.unit_price <= 0
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Distribution"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Gross Profit</TableHead>
              <TableHead>Margin %</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDistributions.map((distribution) => (
              <TableRow key={distribution.id}>
                <TableCell className="font-medium">{distribution.recipient_name}</TableCell>
                <TableCell>{distribution.recipient_contact || "-"}</TableCell>
                <TableCell>{distribution.product_name || 'Unknown'}</TableCell>
                <TableCell>{formatNumber(distribution.quantity || 0)}</TableCell>
                <TableCell>{formatCurrency(distribution.unit_price || 0)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(distribution.total_value || 0)}</TableCell>
                <TableCell className="text-red-600">{formatCurrency(distribution.cost_of_goods_sold || 0)}</TableCell>
                <TableCell
                  className={`font-semibold ${(distribution.gross_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(distribution.gross_profit || 0)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={(distribution.profit_margin_percent || 0) >= 20 ? "default" : "secondary"}
                    className={
                      (distribution.profit_margin_percent || 0) >= 20
                        ? "bg-green-600"
                        : (distribution.profit_margin_percent || 0) >= 10
                          ? "bg-yellow-600"
                          : "bg-red-600"
                    }
                  >
                    {(distribution.profit_margin_percent || 0).toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell>{new Date(distribution.distribution_date).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(distribution.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredDistributions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">No distributions found for this month</p>
          <p className="text-sm text-slate-400">Create your first distribution to start tracking sales</p>
        </div>
      )}
    </div>
  )
}
