# Reports Tab - Detailed Breakdown Cards

## 🎯 Feature Added

Added comprehensive **detailed breakdown cards** below the overview metrics in the Reports tab. Each mini card now has a corresponding detailed card explaining the data in depth.

## 📊 Detailed Cards Added

### 1. **Inventory Detailed Breakdown** 📦

Located in the left column, provides complete inventory analysis:

#### Finished Products Section (Blue)
- **Total Items**: Count of all finished product types
- **In Stock Items**: Products above minimum stock level
- **Total Units Available**: Sum of all available finished product units
- **Total Value**: Calculated as `quantity × selling_price` for all finished products

#### Raw Materials Section (Gray)
- **Total Materials**: Count of raw material types
- **Total Units**: Sum of all raw material quantities
- **Total Value**: Calculated as `quantity × unit_cost` for all raw materials

#### Low Stock Alert (Amber) - Only shown if items are low
- Lists up to 3 low stock items with current/minimum quantities
- Shows count of additional low stock items if more than 3
- Example: "60W Braided C to C Cable: 0 / 5"

**Color Coding:**
- 🔵 Blue background for finished products
- ⚪ Gray background for raw materials  
- 🟡 Amber background for low stock alerts

---

### 2. **Revenue & Profit Breakdown** 💰

Located in the right column, shows sales performance:

#### Revenue Details Section (Green)
- **Total Distributions**: All distribution records
- **Completed Orders**: Distributions with completed status
- **Total Units Sold**: Sum of quantities from all distributions
- **Total Revenue**: Sum of all distribution values

#### Profit Analysis Section (Purple)
- **Gross Profit**: Total profit from all sales
- **Cost of Goods Sold**: Total cost of products sold
- **Profit Margin**: Percentage calculation `(profit / revenue) × 100`
- **Avg Profit per Order**: `total profit / number of distributions`

#### Top Revenue Products (Blue)
- Lists top 3 products by revenue
- Shows product name and revenue amount
- Sorted highest to lowest

**Color Coding:**
- 🟢 Green for revenue metrics
- 🟣 Purple for profit analysis
- 🔵 Blue for product breakdown

---

### 3. **Production Detailed Analysis** 🏭

Located in the left column (second row), manufacturing performance:

#### Production Summary (Orange)
- **Total Batches**: Count of production batches this period
- **Units Produced**: Total units manufactured
- **Production Cost**: Total cost of all production
- **Avg Cost per Unit**: `total cost / total units produced`

#### Quality Control (Green)
- **Units Accepted**: Produced units - rejected units
- **Units Rejected**: Sum of rejected_units from all batches
- **Acceptance Rate**: `(accepted / produced) × 100`

#### Recent Batches (Gray)
- Lists up to 3 recent production batches
- Shows product name and units produced
- Displays "+X more batches" if more than 3

**Color Coding:**
- 🟠 Orange for production metrics
- 🟢 Green for quality metrics
- ⚪ Gray for batch list

---

### 4. **Distribution Details** 👥

Located in the right column (second row), sales distribution analysis:

#### Distribution Overview (Indigo)
- **Total Distributions**: Count of all distributions
- **Unique Customers**: Number of distinct recipients
- **Total Units Distributed**: Sum of all quantities distributed
- **Total Value**: Sum of all distribution values

#### Top Customers by Revenue (Green)
- Lists top 3 customers by total revenue
- Shows customer name and total spent
- Dynamically calculated from distributions

#### Products Distributed (Blue)
- Top 3 products by quantity distributed
- Shows product name and total units
- Helps identify popular products

#### Order Status (Gray)
- **Completed**: Green indicator
- **Pending**: Amber indicator (only shown if > 0)
- **Cancelled**: Red indicator (only shown if > 0)

**Color Coding:**
- 🔵 Indigo for overview
- 🟢 Green for top customers
- 🔵 Blue for products
- ⚪ Gray for status breakdown

---

## 📐 Layout Structure

```
Overview Cards (6 cards in a row)
├── Total Inventory
├── Revenue
├── Profit
├── Production Cost
├── Production
└── Low Stock

Detailed Breakdown Cards (2×2 grid)
├── Row 1:
│   ├── Inventory Detailed Breakdown (left)
│   └── Revenue & Profit Breakdown (right)
└── Row 2:
    ├── Production Detailed Analysis (left)
    └── Distribution Details (right)

Payment Recovery Section (if data exists)
└── Recovery metrics cards
```

## 🎨 Visual Features

### Card Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>
      <Icon /> Title
    </CardTitle>
    <CardDescription>
      Brief description
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Multiple colored sections */}
    </div>
  </CardContent>
</Card>
```

### Section Structure
```tsx
<div className="p-4 bg-{color}-50 rounded-lg">
  <h4 className="font-semibold text-{color}-900 mb-3">
    Section Title
  </h4>
  <div className="space-y-2">
    {/* Key-value pairs */}
    <div className="flex justify-between text-sm">
      <span className="text-{color}-700">Label:</span>
      <span className="font-semibold">Value</span>
    </div>
  </div>
</div>
```

## 💡 Key Features

### 1. **Real-time Calculations**
All values are calculated on-the-fly from `monthlyData`:
```typescript
// Example: Finished Products Value
finishedProducts.reduce((sum: number, item: any) => {
  const quantity = item.quantity || 0
  const price = item.selling_price || item.unit_cost || 0
  return sum + (quantity * price)
}, 0)
```

### 2. **Smart Filtering**
- Only shows low stock alert if items exist
- Only shows pending/cancelled status if count > 0
- Displays "No data" messages when appropriate

### 3. **Top N Lists**
- All "Top X" lists limited to 3 items for clarity
- Shows "+X more" indicator for additional items
- Sorted by most relevant metric (revenue, quantity, etc.)

### 4. **Consistent Formatting**
- Currency: `formatCurrency()` - $42,000.00
- Numbers: `formatNumber()` - 1,234
- Percentages: `.toFixed(1)` - 74.2%

### 5. **Color-Coded Insights**
- 🟢 Green = Positive/Revenue/Success
- 🔴 Red = Costs/Rejected/Issues  
- 🟡 Amber = Warnings/Pending
- 🔵 Blue = Information/Products
- 🟣 Purple = Profit/Analysis
- 🟠 Orange = Production/Manufacturing
- 🔵 Indigo = Distribution/Customers

## 📊 Data Sources

### Inventory Data
```typescript
monthlyData.inventory[]
  ├── item_type: "finished_product" | "raw_material"
  ├── quantity: number (real-time)
  ├── selling_price: number
  ├── unit_cost: number
  └── minimum_stock: number
```

### Distribution Data
```typescript
monthlyData.distributions[]
  ├── recipient_name: string
  ├── product_name: string
  ├── quantity: number
  ├── total_value: number
  ├── cost_of_goods_sold: number
  ├── gross_profit: number
  └── status: "completed" | "pending" | "cancelled"
```

### Production Data
```typescript
monthlyData.production[]
  ├── product_name: string
  ├── quantity_produced: number
  ├── rejected_units: number
  ├── total_cost: number
  └── cost_per_unit: number
```

### Summary Data
```typescript
monthlyData.summary
  ├── totalInventoryValue: number
  ├── totalRevenue: number
  ├── totalProfit: number
  ├── totalProductionCost: number
  └── totalUnitsProduced: number
```

## 🎯 Business Value

### For Management
- **Quick Overview**: 6 KPI cards at top
- **Deep Dive**: 4 detailed cards for analysis
- **Actionable Insights**: Low stock alerts, quality rates, top customers

### For Operations
- **Inventory Management**: See what's in stock, what's low
- **Production Efficiency**: Quality rates, cost per unit
- **Distribution Tracking**: Customer orders, product movement

### For Sales
- **Revenue Breakdown**: Which customers/products generating most revenue
- **Profit Analysis**: Margins and profitability by product
- **Customer Insights**: Top customers and their purchase patterns

### For Finance
- **Cost Analysis**: Production costs, COGS, profit margins
- **Value Tracking**: Inventory value, revenue, profit
- **ROI Metrics**: Cost per unit, profit per order

## 🚀 Usage Example

### Viewing Detailed Inventory
1. Look at **Total Inventory** card at top: **$76,072**
2. Scroll to **Inventory Detailed Breakdown** card
3. See breakdown:
   - Finished Products: $0 (0 items in stock)
   - Raw Materials: $76,072 (all value is in materials)
   - Low Stock: 1 item (60W Braided C to C Cable)

### Analyzing Profitability
1. Look at **Profit** card: **$31,173.08** at 74.2% margin
2. Scroll to **Revenue & Profit Breakdown** card
3. See details:
   - Gross Profit: $31,173.08
   - COGS: $10,826.92
   - Profit Margin: 74.2%
   - Avg Profit per Order: $15,586.54

### Monitoring Production
1. Look at **Production** card: **100 units** from 1 batch
2. Scroll to **Production Detailed Analysis** card
3. See metrics:
   - Units Accepted: 94 (94% acceptance rate)
   - Units Rejected: 6
   - Recent Batch: 60W Braided C to C Cable - 100 units

### Tracking Distributions
1. Look at **Distributions** overview card (shows count)
2. Scroll to **Distribution Details** card
3. See breakdown:
   - 2 distributions to 2 unique customers
   - 94 units distributed worth $42,000
   - Top Customer: dekord online - $25,000
   - Top Product: Product XYZ - 50 units

## ✅ Benefits

### 1. **Comprehensive Visibility**
- All key metrics visible without clicking through tabs
- Understand full picture of business performance

### 2. **Context-Rich Data**
- Not just numbers - see what drives them
- Understand relationships between metrics

### 3. **Actionable Insights**
- Low stock alerts for immediate action
- Top customers/products for strategic focus
- Quality rates for production improvements

### 4. **Beautiful Design**
- Color-coded sections for quick scanning
- Consistent layout and spacing
- Professional appearance

### 5. **Mobile Responsive**
- 2-column layout on desktop
- Stacks to 1-column on mobile
- All data accessible on any device

---

## 📁 File Modified

**File**: `/home/skaps/sims/components/monthly-reports.tsx`

**Lines**: 542-976 (new detailed cards section)

**Components Used**:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from shadcn/ui
- `Package`, `TrendingUp`, `Factory`, `Users`, `AlertTriangle` icons from lucide-react
- `formatCurrency`, `formatNumber` from api-helpers

---

## ✅ Status

**Complete**: All 4 detailed breakdown cards implemented and working
- ✅ Inventory Detailed Breakdown
- ✅ Revenue & Profit Breakdown
- ✅ Production Detailed Analysis
- ✅ Distribution Details

**Features**:
- ✅ Real-time calculations
- ✅ Color-coded sections
- ✅ Top N lists with overflow indicators
- ✅ Conditional rendering (low stock alerts, status)
- ✅ Responsive grid layout
- ✅ Professional styling

**Ready for production use!** 🚀
