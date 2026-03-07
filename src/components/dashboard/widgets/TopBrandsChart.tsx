"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';

interface TopBrandsChartProps {
    data: {
        name: string;
        value: number; // Quantity sold
    }[];
}

export function TopBrandsChart({ data }: TopBrandsChartProps) {
    // Colors for top 5 brands - from Indigo palette
    const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

    // Handle empty data
    if (!data || data.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Top Moving Items
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                    No sales data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full transition-all hover:shadow-md">
            <CardHeader className="pb-0">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                        Top Moving Items
                    </CardTitle>
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">Qty Sold</span>
                </div>
                <CardDescription className="text-xs text-slate-400 pt-1">
                    Performance by quantity sold
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={data}
                            margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs">
                                                <p className="font-bold text-slate-700">{payload[0].payload.name}</p>
                                                <p className="text-indigo-600 font-mono">
                                                    {payload[0].value} sold
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
