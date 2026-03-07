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

export function formatSalesReportData(sales: any[]): FormattedSaleRow[] {
    return sales.flatMap((sale) =>
        sale.sale_item.map((item: any) => ({
            sale_id: sale.sale_id,
            sale_date: sale.sale_date?.substring(0, 10) || "—",
            item_name: item.inventory_item?.name || "—",
            item_category: item.inventory_item?.category || "—",
            quantity: item.quantity || 0,
            price_at_sale: item.price_at_sale || 0,
            line_total: item.line_total || 0,
            profit: item.profit || 0,
            payment_method: sale.payment_method || "N/A",
            customer_id: sale.customer_id || "",
            customer: sale.customer?.name || "—",
            branch_id: sale.branch_id || "",
            vehicle_type: "", // Not currently in the API response, placeholder
        }))
    );
}
