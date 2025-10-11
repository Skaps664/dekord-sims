"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  Plus,
  Upload,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react"

interface Payment {
  id: string | number
  distribution_id?: string | number
  recipient_name: string
  recipient_type: string
  amount_paid: number
  payment_date: string
  payment_method: string
  proof_image_url?: string | null
  notes?: string
  created_at?: string
}

interface RecipientSummary {
  recipient_name: string
  recipient_type: string
  total_distributed: number
  total_paid: number
  outstanding: number
  distribution_count: number
}

interface RecoverySummary {
  totalDistributed: number
  totalRecovered: number
  totalOutstanding: number
  recoveryRate: number
  recipients: RecipientSummary[]
}

interface Distribution {
  id: string | number
  recipient_name?: string
  total_amount?: number
  distribution_date?: string
}

interface RecoveryManagementProps {
  distributions: Distribution[]
}

export function RecoveryManagement({ distributions }: RecoveryManagementProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [recoverySummary, setRecoverySummary] = useState<RecoverySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    recipient_name: "",
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    proof_image_url: "",
    notes: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [paymentsRes, summaryRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/recovery-summary"),
      ])

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        setPayments(paymentsData.data || [])
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setRecoverySummary(summaryData.data || null)
      }
    } catch (error) {
      console.error("Error loading recovery data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async () => {
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount_paid: parseFloat(formData.amount_paid),
        }),
      })

      if (response.ok) {
        await loadData()
        setShowAddPaymentDialog(false)
        setFormData({
          recipient_name: "",
          amount_paid: "",
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: "cash",
          proof_image_url: "",
          notes: "",
        })
      }
    } catch (error) {
      console.error("Error adding payment:", error)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, upload to cloud storage (S3, Cloudinary, etc.)
      // For now, we'll use a data URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, proof_image_url: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const filteredPayments = selectedRecipient
    ? payments.filter((p) => p.recipient_name === selectedRecipient)
    : payments

  const recipientOptions = Array.from(
    new Set(distributions.map((d) => d.recipient_name).filter(Boolean))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading recovery data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Distributed</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ${(recoverySummary?.totalDistributed || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">Stock value given out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Recovered</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(recoverySummary?.totalRecovered || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">Payments received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${(recoverySummary?.totalOutstanding || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Recovery Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(recoverySummary?.recoveryRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500">Payment collection rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recipients & Outstanding Balances</CardTitle>
              <CardDescription>Track payments from each distributor or customer</CardDescription>
            </div>
            <Button onClick={() => setShowAddPaymentDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Given</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recoverySummary?.recipients.map((recipient, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{recipient.recipient_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {recipient.recipient_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${recipient.total_distributed.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">
                    ${recipient.total_paid.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-amber-600 font-medium">
                    ${recipient.outstanding.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {recipient.outstanding === 0 ? (
                      <Badge className="bg-green-100 text-green-700">Paid</Badge>
                    ) : recipient.outstanding === recipient.total_distributed ? (
                      <Badge className="bg-red-100 text-red-700">Unpaid</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">Partial</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSelectedRecipient(
                          selectedRecipient === recipient.recipient_name ? null : recipient.recipient_name
                        )
                      }
                    >
                      View Payments
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payment History {selectedRecipient && `- ${selectedRecipient}`}
            {selectedRecipient && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedRecipient(null)} className="ml-2">
                <XCircle className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
          <CardDescription>All recorded payments and proof of transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center">Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{payment.recipient_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      <CreditCard className="w-3 h-3 mr-1" />
                      {payment.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    ${payment.amount_paid.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{payment.notes || "-"}</TableCell>
                  <TableCell className="text-center">
                    {payment.proof_image_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImage(payment.proof_image_url!)
                          setShowImageDialog(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-slate-400 text-sm">No proof</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Add a payment received from a distributor or customer</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient</label>
              <select
                value={formData.recipient_name}
                onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required
              >
                <option value="">Select recipient...</option>
                {recipientOptions.map((name, index) => (
                  <option key={index} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount Paid</label>
              <input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date</label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
                <option value="mobile_payment">Mobile Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload Proof (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
              {formData.proof_image_url && (
                <div className="mt-2">
                  <img
                    src={formData.proof_image_url}
                    alt="Payment proof"
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={!formData.recipient_name || !formData.amount_paid}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex items-center justify-center">
              <img src={selectedImage} alt="Payment proof" className="max-w-full max-h-[70vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
