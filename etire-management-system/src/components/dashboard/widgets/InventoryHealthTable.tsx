"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, AlertCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface InventoryHealthTableProps {
    data: {
        item_id: string;
        name: string;
        stock_quantity: number;
        reorder_level: number;
        supplier_name: string;
    }[];
}

export function InventoryHealthTable({ data }: InventoryHealthTableProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="h-full border-l-4 border-emerald-500">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        Inventory Healthy
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                        No items are below reorder level.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="h-full border-l-4 border-red-500 transition-all hover:shadow-md overflow-hidden">
            <CardHeader className="pb-3 bg-red-50/30">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold text-red-600 flex items-center gap-2 uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4" />
                        Critical Low Stock
                    </CardTitle>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {data.length} Items
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="py-2 h-9 text-xs font-semibold">Item Name</TableHead>
                                <TableHead className="py-2 h-9 text-xs font-semibold text-center">Stock</TableHead>
                                <TableHead className="py-2 h-9 text-xs font-semibold text-center">Limit</TableHead>
                                <TableHead className="py-2 h-9 text-xs font-semibold text-right">Supplier</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.item_id}>
                                    <TableCell className="py-2.5 text-xs font-medium text-slate-700 truncate max-w-[150px]">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-center font-bold text-red-600 bg-red-50/50">
                                        {item.stock_quantity}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-center text-slate-500">
                                        {item.reorder_level}
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs text-right text-slate-400 truncate max-w-[100px]">
                                        {item.supplier_name}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
