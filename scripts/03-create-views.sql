-- Create useful views for reporting and analytics

-- Inventory summary view
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    p.unit_price,
    p.cost_price,
    i.quantity as current_stock,
    i.minimum_stock,
    i.maximum_stock,
    i.location,
    CASE 
        WHEN i.quantity <= i.minimum_stock THEN 'Low Stock'
        WHEN i.quantity >= i.maximum_stock THEN 'Overstock'
        ELSE 'Normal'
    END as stock_status,
    (i.quantity * p.cost_price) as inventory_value,
    i.last_updated
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id;

-- Production profitability view
CREATE OR REPLACE VIEW production_profitability AS
SELECT 
    pb.id as batch_id,
    pb.batch_number,
    p.name as product_name,
    pb.quantity_produced,
    pb.total_cost,
    pb.cost_per_unit,
    p.unit_price,
    (p.unit_price - pb.cost_per_unit) as profit_per_unit,
    ((p.unit_price - pb.cost_per_unit) * pb.quantity_produced) as total_potential_profit,
    ROUND(((p.unit_price - pb.cost_per_unit) / p.unit_price * 100), 2) as profit_margin_percent,
    pb.production_date,
    pb.status
FROM production_batches pb
JOIN products p ON pb.product_id = p.id;

-- Distribution performance view
CREATE OR REPLACE VIEW distribution_performance AS
SELECT 
    d.id as distribution_id,
    p.name as product_name,
    d.recipient_name,
    d.quantity,
    d.unit_price,
    d.total_value,
    p.cost_price,
    (d.quantity * p.cost_price) as cost_of_goods_sold,
    (d.total_value - (d.quantity * p.cost_price)) as gross_profit,
    ROUND(((d.total_value - (d.quantity * p.cost_price)) / d.total_value * 100), 2) as profit_margin_percent,
    d.distribution_date,
    d.status
FROM distributions d
JOIN products p ON d.product_id = p.id;

-- Monthly financial summary view
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    transaction_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM financial_transactions
GROUP BY DATE_TRUNC('month', transaction_date), transaction_type
ORDER BY month DESC, transaction_type;

-- Top performing products view
CREATE OR REPLACE VIEW top_performing_products AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    COALESCE(SUM(d.quantity), 0) as total_sold,
    COALESCE(SUM(d.total_value), 0) as total_revenue,
    COALESCE(SUM(d.quantity * p.cost_price), 0) as total_cost,
    COALESCE(SUM(d.total_value) - SUM(d.quantity * p.cost_price), 0) as total_profit,
    CASE 
        WHEN SUM(d.total_value) > 0 
        THEN ROUND(((SUM(d.total_value) - SUM(d.quantity * p.cost_price)) / SUM(d.total_value) * 100), 2)
        ELSE 0 
    END as profit_margin_percent
FROM products p
LEFT JOIN distributions d ON p.id = d.product_id
GROUP BY p.id, p.name, p.category
ORDER BY total_profit DESC;

-- Raw material usage view
CREATE OR REPLACE VIEW raw_material_usage AS
SELECT 
    rm.id as material_id,
    rm.name as material_name,
    rm.unit,
    rm.cost_per_unit,
    rm.stock_quantity as current_stock,
    rm.minimum_stock,
    COALESCE(SUM(pc.quantity), 0) as total_used,
    COALESCE(SUM(pc.total_cost), 0) as total_cost_used,
    CASE 
        WHEN rm.stock_quantity <= rm.minimum_stock THEN 'Reorder Required'
        ELSE 'Sufficient Stock'
    END as stock_status
FROM raw_materials rm
LEFT JOIN production_costs pc ON rm.id = pc.raw_material_id
GROUP BY rm.id, rm.name, rm.unit, rm.cost_per_unit, rm.stock_quantity, rm.minimum_stock
ORDER BY total_cost_used DESC;
