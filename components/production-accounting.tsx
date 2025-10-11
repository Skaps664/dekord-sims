"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Factory, Calculator, DollarSign, Package, X, Loader2, Pencil } from "lucide-react"
import { formatCurrency, formatNumber, formatDate } from "@/lib/api-helpers"

interface Product {
  id: number
  name: string
  description: string
  category: string
  unit_price: number
  cost_price: number
  barcode?: string
}

interface RawMaterial {
  id: number
  name: string
  unit: string
  unit_cost: number
  supplier: string
  quantity: number
  minimum_stock: number
}

interface ProductionBatch {
  id: number
  batch_number?: string
  batchNumber?: string
  product_id?: number
  product_name?: string
  productName?: string
  quantity_produced?: number
  quantityProduced?: number
  production_date?: string
  productionDate?: string
  productionDateString?: string
  total_cost?: number
  totalCost?: number
  cost_per_unit?: number
  costPerUnit?: number
  notes?: string
}

interface ProductionCost {
  cost_type: string
  item_name: string
  quantity?: number
  unit_cost: number
  raw_material_id?: number
}

interface ProductionAccountingProps {
  selectedMonth: string
  onRefresh?: () => void
}

export function ProductionAccounting({ selectedMonth, onRefresh }: ProductionAccountingProps) {
  const [showAddBatchDialog, setShowAddBatchDialog] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])

  const [newBatch, setNewBatch] = useState({
    batch_number: "",
    product_id: "",
    productName: "",
    quantity_produced: 0,
    production_date: formatDate(new Date()),
    notes: "",
    rawMaterials: [] as Array<{
      raw_material_id: number
      item_name: string
      quantity: number
      unit_cost: number
    }>,
    fixedCosts: {
      labor: 0,
      electricity: 0,
      packing: 0,
      advertising: 0,
    },
    miscellaneousCosts: [] as Array<{ description: string; amount: number }>,
  })

  const [rawMaterialInput, setRawMaterialInput] = useState({
    raw_material_id: 0,
    item_name: "",
    quantity: 0,
    unit_cost: 0,
  })
  const [miscCostInput, setMiscCostInput] = useState({ description: "", amount: 0 })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, rawMaterialsRes, batchesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/raw-materials"),
        fetch("/api/production-batches"),
      ])

      const [productsResult, rawMaterialsResult, batchesResult] = await Promise.all([
        productsRes.json(),
        rawMaterialsRes.json(),
        batchesRes.json(),
      ])

      if (productsResult.success) setProducts(productsResult.data)
      if (rawMaterialsResult.success) setRawMaterials(rawMaterialsResult.data)
      if (batchesResult.success) setProductionBatches(batchesResult.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter batches by selected month
  const filteredBatches = productionBatches.filter((batch) => {
    // Support both snake_case and camelCase date fields returned from backend
    const dateStr = batch.production_date || batch.productionDate || batch.productionDateString || null
    const batchDate = dateStr ? new Date(dateStr) : new Date('')
    const selectedDate = new Date(selectedMonth + "-01")
    const matches = !isNaN(batchDate.getTime()) && batchDate.getFullYear() === selectedDate.getFullYear() && batchDate.getMonth() === selectedDate.getMonth()

    console.log('[Production] Batch:', batch.id, 'Date:', dateStr, 'Parsed:', batchDate, 'Year:', batchDate.getFullYear(), 'Month:', batchDate.getMonth(), 'Matches:', matches)

    return matches
  })
  
  console.log('[Production] Selected month:', selectedMonth, 'Selected date:', new Date(selectedMonth + "-01"), 'Total batches:', productionBatches.length, 'Filtered batches:', filteredBatches.length)

  // Calculate monthly totals
  const monthlyTotals = {
    totalBatches: filteredBatches.length,
    totalUnitsProduced: filteredBatches.reduce((sum, batch) => sum + (batch.quantity_produced || batch.quantityProduced || 0), 0),
    totalCost: filteredBatches.reduce((sum, batch) => sum + (batch.total_cost || batch.totalCost || 0), 0),
    averageCostPerUnit:
      filteredBatches.length > 0
        ? filteredBatches.reduce((sum, batch) => sum + (batch.cost_per_unit || batch.costPerUnit || 0), 0) / filteredBatches.length
        : 0,
  }

  const addMiscellaneousCost = () => {
    if (miscCostInput.description && miscCostInput.amount > 0) {
      setNewBatch({
        ...newBatch,
        miscellaneousCosts: [...newBatch.miscellaneousCosts, { ...miscCostInput }],
      })
      setMiscCostInput({ description: "", amount: 0 })
    }
  }

  const calculateTotalCost = () => {
    const rawMaterialTotal = newBatch.rawMaterials.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
    const fixedCostsTotal = Object.values(newBatch.fixedCosts).reduce((sum, cost) => sum + cost, 0)
    const miscTotal = newBatch.miscellaneousCosts.reduce((sum, item) => sum + item.amount, 0)
    return rawMaterialTotal + fixedCostsTotal + miscTotal
  }

  const saveBatch = async () => {
    if (!newBatch.batch_number || !newBatch.product_id || newBatch.quantity_produced <= 0) {
      alert("Please fill in all required fields (Batch Number, Product, Units Produced)")
      return
    }

    if (newBatch.rawMaterials.length === 0 && 
        Object.values(newBatch.fixedCosts).every(cost => cost === 0) && 
        newBatch.miscellaneousCosts.length === 0) {
      const confirm = window.confirm(
        "No costs have been added to this batch. Are you sure you want to continue?"
      )
      if (!confirm) return
    }

    try {
      setSaving(true)
      const totalCost = calculateTotalCost()

      // Prepare costs array for API
      const costs: ProductionCost[] = []

      // Add raw material costs
      newBatch.rawMaterials.forEach((material) => {
        costs.push({
          cost_type: "raw_material",
          item_name: material.item_name,
          quantity: material.quantity,
          unit_cost: material.unit_cost,
          raw_material_id: material.raw_material_id || undefined,
        })
      })

      // Add fixed costs
      Object.entries(newBatch.fixedCosts).forEach(([type, amount]) => {
        if (amount > 0) {
          costs.push({
            cost_type: "overhead",
            item_name: type.charAt(0).toUpperCase() + type.slice(1),
            unit_cost: amount,
          })
        }
      })

      // Add miscellaneous costs
      newBatch.miscellaneousCosts.forEach((cost) => {
        costs.push({
          cost_type: "miscellaneous",
          item_name: cost.description,
          unit_cost: cost.amount,
        })
      })

      const requestData = {
        batch_number: newBatch.batch_number,
        product_id: newBatch.product_id,
        product_name: newBatch.productName,
        quantity_produced: newBatch.quantity_produced,
        production_date: newBatch.production_date,
        raw_materials_used: newBatch.rawMaterials,
        total_cost: totalCost,
        notes: newBatch.notes,
        costs,
      }
      
      console.log('[Production] Creating batch with data:', requestData)

      const response = await fetch("/api/production-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setNewBatch({
          batch_number: "",
          product_id: "",
          productName: "",
          quantity_produced: 0,
          production_date: formatDate(new Date()),
          notes: "",
          rawMaterials: [],
          fixedCosts: { labor: 0, electricity: 0, packing: 0, advertising: 0 },
          miscellaneousCosts: [],
        })
        setShowAddBatchDialog(false)
        await fetchData() // Refresh data
        onRefresh?.()
      } else {
        console.error("Failed to create batch:", result.error)
        alert("Failed to create batch: " + result.error)
      }
    } catch (error) {
      console.error("Error creating batch:", error)
      alert("Error creating batch. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const removeRawMaterial = (index: number) => {
    const updatedMaterials = newBatch.rawMaterials.filter((_, i) => i !== index)
    setNewBatch({ ...newBatch, rawMaterials: updatedMaterials })
  }

  const removeMiscellaneousCost = (index: number) => {
    const updatedCosts = newBatch.miscellaneousCosts.filter((_, i) => i !== index)
    setNewBatch({ ...newBatch, miscellaneousCosts: updatedCosts })
  }

  const handleRawMaterialSelect = (materialId: string) => {
    const selectedMaterial = rawMaterials.find((material) => material.id === Number.parseInt(materialId))
    if (selectedMaterial) {
      setRawMaterialInput({
        raw_material_id: selectedMaterial.id,
        item_name: selectedMaterial.name,
        quantity: 0,
        unit_cost: selectedMaterial.unit_cost || 0,
      })
    }
  }

  const addRawMaterial = () => {
    if (rawMaterialInput.item_name && rawMaterialInput.quantity > 0 && rawMaterialInput.unit_cost > 0) {
      setNewBatch({
        ...newBatch,
        rawMaterials: [...newBatch.rawMaterials, { ...rawMaterialInput }],
      })
      // Reset the input after adding
      setRawMaterialInput({ raw_material_id: 0, item_name: "", quantity: 0, unit_cost: 0 })
    }
  }

  const handleProductSelect = (productId: string) => {
    const selectedProduct = products.find(p => p.id.toString() === productId)
    setNewBatch({ 
      ...newBatch, 
      product_id: productId,
      productName: selectedProduct?.name || ''
    })
  }

  const handleEditBatch = (batch: any) => {
    // Note: Editing is view-only for now since production batches affect inventory
    // In a real system, editing would require reversing inventory changes
    alert(`Viewing Batch: ${batch.batch_number || batch.batchNumber}\n\nNote: Production batches cannot be edited after creation because they affect inventory levels. To make changes, please create a new batch.`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading production data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Production Accounting</h2>
          <p className="text-slate-600">
            Track manufacturing costs and analyze production efficiency for{" "}
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Dialog open={showAddBatchDialog} onOpenChange={setShowAddBatchDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Production Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl">Create Production Batch</DialogTitle>
              <DialogDescription>
                Record all costs associated with manufacturing a batch of products
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="border rounded-lg p-4">
                <h3 className="text-base font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batch_number" className="text-sm">Batch Number *</Label>
                    <Input
                      id="batch_number"
                      value={newBatch.batch_number}
                      onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                      placeholder="e.g., BATCH-001"
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product" className="text-sm">Product *</Label>
                    <Select onValueChange={handleProductSelect} value={newBatch.product_id}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity_produced" className="text-sm">Units Produced *</Label>
                    <Input
                      id="quantity_produced"
                      type="number"
                      step="0.01"
                      value={newBatch.quantity_produced || ''}
                      onChange={(e) =>
                        setNewBatch({ ...newBatch, quantity_produced: Number.parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="production_date" className="text-sm">Production Date</Label>
                    <Input
                      id="production_date"
                      type="date"
                      value={newBatch.production_date}
                      onChange={(e) => setNewBatch({ ...newBatch, production_date: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Materials Section */}
              <div className="border rounded-lg p-4 mt-4">
                <h3 className="text-base font-semibold mb-2">Raw Materials Used</h3>
                <p className="text-xs text-gray-500 mb-3">
                  <strong>Important:</strong> Select a material, enter quantity, then click the <strong>Add Material</strong> button to include it in the batch
                </p>
                <div className="space-y-3">
                  <div className="flex flex-col gap-3">
                    {/* Row 1: Material Selection and Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Raw Material</Label>
                        <Select onValueChange={handleRawMaterialSelect} value={rawMaterialInput.raw_material_id?.toString() || ""}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id.toString()}>
                                {material.name} - Stock: {formatNumber(material.quantity)} @ {formatCurrency(material.unit_cost)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Quantity to Use</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter quantity"
                          value={rawMaterialInput.quantity || ''}
                          onChange={(e) =>
                            setRawMaterialInput({ ...rawMaterialInput, quantity: Number.parseFloat(e.target.value) || 0 })
                          }
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    {/* Row 2: Costs and Add Button */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Unit Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={rawMaterialInput.unit_cost || ''}
                          disabled
                          className="h-10 bg-gray-100 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Total Cost</Label>
                        <div className="px-3 py-2 bg-blue-50 rounded-md border border-blue-200 text-sm font-bold h-10 flex items-center justify-end text-blue-700">
                          {formatCurrency((rawMaterialInput.quantity || 0) * (rawMaterialInput.unit_cost || 0))}
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-sm font-medium">&nbsp;</Label>
                        <Button
                          type="button"
                          onClick={addRawMaterial}
                          size="default"
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                          disabled={!rawMaterialInput.item_name || rawMaterialInput.quantity <= 0}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Material to Batch
                        </Button>
                      </div>
                    </div>
                  </div>

                  {newBatch.rawMaterials.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <h4 className="font-medium text-sm">Added Materials:</h4>
                      {newBatch.rawMaterials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border text-sm">
                          <div className="flex-1">
                            <span className="font-medium">{material.item_name}</span>
                            <span className="text-gray-600 ml-2">
                              ({formatNumber(material.quantity)} × {formatCurrency(material.unit_cost)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {formatCurrency(material.quantity * material.unit_cost)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRawMaterial(index)}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Costs Section */}
              <div className="border rounded-lg p-4 mt-4">
                <h3 className="text-base font-semibold mb-4">Fixed Costs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laborCost" className="text-sm">Labor Cost</Label>
                    <Input
                      id="laborCost"
                      type="number"
                      step="0.01"
                      value={newBatch.fixedCosts.labor || ''}
                      onChange={(e) =>
                        setNewBatch({
                          ...newBatch,
                          fixedCosts: { ...newBatch.fixedCosts, labor: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="electricityCost" className="text-sm">Electricity Cost</Label>
                    <Input
                      id="electricityCost"
                      type="number"
                      step="0.01"
                      value={newBatch.fixedCosts.electricity || ''}
                      onChange={(e) =>
                        setNewBatch({
                          ...newBatch,
                          fixedCosts: { ...newBatch.fixedCosts, electricity: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packingCost" className="text-sm">Packing Cost</Label>
                    <Input
                      id="packingCost"
                      type="number"
                      step="0.01"
                      value={newBatch.fixedCosts.packing || ''}
                      onChange={(e) =>
                        setNewBatch({
                          ...newBatch,
                          fixedCosts: { ...newBatch.fixedCosts, packing: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advertisingCost" className="text-sm">Advertising Cost</Label>
                    <Input
                      id="advertisingCost"
                      type="number"
                      step="0.01"
                      value={newBatch.fixedCosts.advertising || ''}
                      onChange={(e) =>
                        setNewBatch({
                          ...newBatch,
                          fixedCosts: { ...newBatch.fixedCosts, advertising: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Miscellaneous Costs Section */}
              <div className="border rounded-lg p-4 mt-4">
                <h3 className="text-base font-semibold mb-4">Miscellaneous Costs</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-7 space-y-2">
                      <Label className="text-sm">Cost Description</Label>
                      <Input
                        placeholder="e.g., Quality testing, Maintenance"
                        value={miscCostInput.description}
                        onChange={(e) => setMiscCostInput({ ...miscCostInput, description: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label className="text-sm">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={miscCostInput.amount || ''}
                        onChange={(e) =>
                          setMiscCostInput({ ...miscCostInput, amount: Number.parseFloat(e.target.value) || 0 })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1 space-y-2">
                      <Label className="text-sm">&nbsp;</Label>
                      <Button type="button" onClick={addMiscellaneousCost} variant="outline" size="sm" className="w-full h-9">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {newBatch.miscellaneousCosts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Added Costs:</h4>
                      {newBatch.miscellaneousCosts.map((cost, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border text-sm">
                          <span className="font-medium flex-1">{cost.description}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(cost.amount)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMiscellaneousCost(index)}
                              className="h-7 w-7 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                  placeholder="Additional notes about this batch..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Cost Summary */}
              <div className="border-t pt-4 mt-6 bg-gray-50 -mx-6 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-900">
                      Total Cost: {formatCurrency(calculateTotalCost())}
                    </div>
                    <div className="text-base text-gray-600">
                      Cost per Unit:{" "}
                      {newBatch.quantity_produced > 0
                        ? formatCurrency(calculateTotalCost() / newBatch.quantity_produced)
                        : formatCurrency(0)}
                    </div>
                  </div>
                  <Button onClick={saveBatch} size="lg" className="px-8" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Batch"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Batches</CardTitle>
            <Factory className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{monthlyTotals.totalBatches}</div>
            <p className="text-xs text-slate-500">Production batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Units Produced</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatNumber(monthlyTotals.totalUnitsProduced)}</div>
            <p className="text-xs text-slate-500">Total units manufactured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Production Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyTotals.totalCost)}</div>
            <p className="text-xs text-slate-500">Manufacturing expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Cost Per Unit</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyTotals.averageCostPerUnit)}</div>
            <p className="text-xs text-slate-500">Average manufacturing cost</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
          <CardDescription>Detailed breakdown of manufacturing costs for each production batch</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Factory className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No production batches recorded for this month</p>
              <p className="text-sm">Create your first batch to start tracking production costs</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Units Produced</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_number || batch.batchNumber || '-'}</TableCell>
                    <TableCell>{batch.product_name || batch.productName || '-'}</TableCell>
                    <TableCell>{formatNumber(batch.quantity_produced || batch.quantityProduced || 0)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(batch.total_cost || batch.totalCost || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatCurrency(batch.cost_per_unit || batch.costPerUnit || 0)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(batch.production_date || batch.productionDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{batch.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBatch(batch)}
                        className="h-8"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
