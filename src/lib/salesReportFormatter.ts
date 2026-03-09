// src/lib/salesReportFormatter.ts

export interface FormattedSaleRow {
    sale_id: string;
    sale_date: string;
    item_name: string;
    item_category: string;
    quantity: number;
    price_at_sale: number;
    line_total: number;
    profit: number;
    payment_method?: string;
    customer_id?: string;
    customer?: string;
    branch_id?: string;
    vehicle_type?: string;
}

export function formatSalesReportData(sales: Record<string, unknown>[]): FormattedSaleRow[] {
    return sales.flatMap((sale) =>
        (sale.sale_item as Record<string, unknown>[]).map((item: Record<string, unknown>) => ({
            sale_id: sale.sale_id as string,
            sale_date: (sale.sale_date as string)?.substring(0, 10) || "—",
            item_name: (item.inventory_item as Record<string, unknown>)?.name as string || "—",
            item_category: (item.inventory_item as Record<string, unknown>)?.category as string || "—",
            quantity: item.quantity as number || 0,
            price_at_sale: item.price_at_sale as number || 0,
            line_total: item.line_total as number || 0,
            profit: item.profit as number || 0,
            payment_method: sale.payment_method as string || "N/A",
            customer_id: sale.customer_id as string || "",
            customer: (sale.customer as Record<string, unknown>)?.name as string || "—",
            branch_id: sale.branch_id as string || "",
            vehicle_type: "", // Not currently in the API response, placeholder
        }))
    );
}
