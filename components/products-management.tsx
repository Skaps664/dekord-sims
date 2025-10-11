"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Package, Calendar, Info } from "lucide-react"

interface Product {
  id: string | number
  name: string
  type: string
  description: string
  ideaCreationDate: string
  productionStartDate: string
  additionalInfo: string
  isActive: boolean
  createdDate: string
}

interface ProductsManagementProps {
  products: Product[]
  // Accept a flexible payload: API expects { name, description, category, unit_price, cost_price, barcode }
  onAddProduct: (product: any) => void
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void
  onDeleteProduct: (productId: string) => void
}

export function ProductsManagement({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductsManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    ideaCreationDate: "",
    productionStartDate: "",
    additionalInfo: "",
    isActive: true,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      description: "",
      ideaCreationDate: "",
      productionStartDate: "",
      additionalInfo: "",
      isActive: true,
    })
    setEditingProduct(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!formData.name || !formData.description || !formData.type) {
      setSubmitError("Please provide a name, details and type")
      return
    }

    if (editingProduct) {
      onUpdateProduct(String(editingProduct.id), formData)
    } else {
      // Pass all form fields to API
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.type,
        ideaCreationDate: formData.ideaCreationDate || null,
        productionStartDate: formData.productionStartDate || null,
        additionalInfo: formData.additionalInfo || null,
        isActive: formData.isActive,
      }
      onAddProduct(payload)
    }
    resetForm()
    setShowAddDialog(false)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      type: product.type,
      description: product.description,
      ideaCreationDate: product.ideaCreationDate,
      productionStartDate: product.productionStartDate,
      additionalInfo: product.additionalInfo,
      isActive: product.isActive,
    })
    setShowAddDialog(true)
  }

  const handleDelete = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      onDeleteProduct(productId)
    }
  }

  const toggleProductStatus = (productId: string, isActive: boolean) => {
    onUpdateProduct(productId, { isActive })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products Management</h2>
          <p className="text-slate-600">Manage your product catalog and specifications</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product information" : "Create a new product with detailed specifications"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 60W Braided C to C Cable"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Product Type *</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="e.g., USB Cable, Adapter"
                    required
                  />
                </div>
              </div>


              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed product description..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ideaCreationDate">Idea/Creation Date</Label>
                  <Input
                    id="ideaCreationDate"
                    type="date"
                    value={formData.ideaCreationDate}
                    onChange={(e) => setFormData({ ...formData, ideaCreationDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productionStartDate">Production Start Date</Label>
                  <Input
                    id="productionStartDate"
                    type="date"
                    value={formData.productionStartDate}
                    onChange={(e) => setFormData({ ...formData, productionStartDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  placeholder="Any other important product information..."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Product is active</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{products.length}</div>
            <p className="text-xs text-slate-500">Products in catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Products</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{products.filter((p) => p.isActive).length}</div>
            <p className="text-xs text-slate-500">Currently in production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Product Types</CardTitle>
            <Info className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{new Set(products.map((p) => p.type)).size}</div>
            <p className="text-xs text-slate-500">Different categories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>Manage your product specifications and details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead>Production Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                // Always use _id as unique key, convert to string for React key
                const uniqueKey = String((product as any)._id || `product-${product.id}-${product.name}`)
                const productIdStr = String(product.id)
                return (
                  <TableRow key={uniqueKey}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                    <TableCell>
                      {product.ideaCreationDate ? new Date(product.ideaCreationDate).toLocaleDateString() : "Not set"}
                    </TableCell>
                    <TableCell>
                      {product.productionStartDate
                        ? new Date(product.productionStartDate).toLocaleDateString()
                        : "Not set"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={product.isActive}
                          onCheckedChange={(checked) => toggleProductStatus(productIdStr, checked)}
                        />
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(productIdStr)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {products.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No products found. Add your first product to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
