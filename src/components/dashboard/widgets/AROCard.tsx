"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Receipt } from 'lucide-react';

interface AROCardProps {
    data: {
        value: number;
        trend: number; // Percentage vs last month
        period: string; // e.g. "This Month"
    };
}

export function AROCard({ data }: AROCardProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

    const isPositive = data.trend >= 0;

    return (
        <Card className="h-full transition-all hover:shadow-md border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    Avg. Repair Order
                </CardTitle>
                <div className="h-8 w-8 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-indigo-600" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                    {formatCurrency(data.value)}
                </div>
                <div className="flex items-center mt-1">
                    {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                    ) : (
                        <TrendingDown className="h-3 w-3 text-rose-500 mr-1" />
                    )}
                    <p className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? '+' : ''}{data.trend.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400 ml-1">
                        vs last month
                    </p>
                </div>

                {/* Tiny Sparkline Visual - Simplified with CSS gradient for visual interest */}
                <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'} opacity-50`}
                        style={{ width: `${Math.min(Math.abs(data.trend) + 20, 100)}%` }} // Dynamic width based on trend magnitude for visual effect
                    />
                </div>
            </CardContent>
        </Card>
    );
}
