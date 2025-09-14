"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Search } from "lucide-react"

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
  productId?: string
}

interface InventoryTableProps {
  inventory: InventoryItem[]
  setInventory: (inventory: InventoryItem[]) => void
  showTypeFilter?: boolean
  inventoryType?: "finished" | "raw"
  compact?: boolean
}

export function InventoryTable({
  inventory,
  setInventory,
  showTypeFilter = true,
  inventoryType,
  compact = false,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredInventory = inventory.filter((item) => {
    const matchesType = !inventoryType || item.inventoryType === inventoryType
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      item.name.toLowerCase().includes(searchLower) ||
      item.sku.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      (item.barcode && item.barcode.toLowerCase().includes(searchLower))

    return matchesType && matchesSearch
  })

  const editItem = (item: InventoryItem) => {
    setEditingItem({ ...item })
  }

  const saveEdit = async () => {
    if (!editingItem) return

    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingItem,
          lastUpdated: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update inventory item")
      }

      const result = await response.json()

      // Update local state with the updated item
      const updatedInventory = inventory.map((item) => (item.id === editingItem.id ? result.data : item))
      setInventory(updatedInventory)
      setEditingItem(null)
    } catch (error) {
      console.error("Error updating inventory item:", error)
      // Fall back to local state update if API fails
      const updatedInventory = inventory.map((item) => (item.id === editingItem.id ? editingItem : item))
      setInventory(updatedInventory)
      setEditingItem(null)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete inventory item")
      }

      // Update local state by removing the deleted item
      const updatedInventory = inventory.filter((item) => item.id !== itemId)
      setInventory(updatedInventory)
    } catch (error) {
      console.error("Error deleting inventory item:", error)
      // Fall back to local state update if API fails
      const updatedInventory = inventory.filter((item) => item.id !== itemId)
      setInventory(updatedInventory)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity <= minStock) {
      return <Badge variant="destructive">Low Stock</Badge>
    } else if (quantity <= minStock * 1.5) {
      return <Badge variant="secondary">Medium</Badge>
    } else {
      return (
        <Badge variant="default" className="bg-green-600">
          Good
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              {!compact && <TableHead>Category</TableHead>}
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unit Cost</TableHead>
              {inventoryType === "finished" && <TableHead>Selling Price</TableHead>}
              {!compact && <TableHead>Supplier</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                {!compact && <TableCell>{item.category}</TableCell>}
                <TableCell>{item.quantity.toLocaleString()}</TableCell>
                <TableCell>{getStockStatus(item.quantity, item.minStock)}</TableCell>
                <TableCell className="text-green-600 font-medium">${item.unitCost.toFixed(2)}</TableCell>
                {inventoryType === "finished" && (
                  <TableCell className="text-blue-600 font-medium">${item.sellingPrice?.toFixed(2) || "N/A"}</TableCell>
                )}
                {!compact && <TableCell>{item.supplier}</TableCell>}
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => editItem(item)} disabled={loading}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-500">No inventory items found</p>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-6">Edit Inventory Item</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <Input
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: Number.parseInt(e.target.value) || 0 })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock</label>
                  <Input
                    type="number"
                    value={editingItem.minStock}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: Number.parseInt(e.target.value) || 0 })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.unitCost}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, unitCost: Number.parseFloat(e.target.value) || 0 })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              {editingItem.inventoryType === "finished" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.sellingPrice || 0}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, sellingPrice: Number.parseFloat(e.target.value) || 0 })
                    }
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Input
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <Input
                  value={editingItem.supplier}
                  onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={saveEdit} className="flex-1" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1" disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
