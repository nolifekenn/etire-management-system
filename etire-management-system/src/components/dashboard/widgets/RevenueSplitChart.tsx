"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { DollarSign } from 'lucide-react';

interface RevenueSplitChartProps {
    data: {
        name: string;
        value: number;
        color: string;
    }[];
}

export function RevenueSplitChart({ data }: RevenueSplitChartProps) {
    // Format for currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

    // Fallback for empty data
    if (!data || data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Revenue Split (Services vs Goods)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                    No revenue data available
                </CardContent>
            </Card>
        );
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <Card className="h-full transition-all hover:shadow-md">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                        Revenue Split
                    </CardTitle>
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">This Month</span>
                </div>
                <CardDescription className="text-2xl font-bold text-slate-800 pt-1">
                    {formatCurrency(totalRevenue)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            {/* Recharts Tooltip typing can be tricky, using 'any' for payload safety */}
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg">
                                                <p className="text-sm font-bold text-slate-700">{payload[0].payload.name}</p>
                                                <p className="text-sm font-mono text-indigo-600">
                                                    {formatCurrency(payload[0].value)}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {((payload[0].value / totalRevenue) * 100).toFixed(1)}% of total
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 border-t border-slate-50 pt-4">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 font-medium">{item.name}</span>
                                <span className="text-[10px] text-slate-400">
                                    {totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(0) : 0}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
