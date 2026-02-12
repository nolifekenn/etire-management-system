"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench } from 'lucide-react';

interface BayUtilizationGaugeProps {
    data: {
        active: number;
        capacity: number;
        utilization: number; // Percentage
    };
}

export function BayUtilizationGauge({ data }: BayUtilizationGaugeProps) {
    // Data for the gauge
    const chartData = [
        { name: 'Active', value: data.active },
        { name: 'Available', value: Math.max(0, data.capacity - data.active) },
    ];

    const COLORS = ['#4f46e5', '#e2e8f0']; // Indigo 600 (active), Slate 200 (empty)

    // Color logic based on utilization
    const activeColor = data.utilization > 80 ? '#ef4444' : // Red if > 80% (busy)
        data.utilization > 50 ? '#f59e0b' : // Orange > 50%
            '#4f46e5'; // Indigo normal

    return (
        <Card className="h-full transition-all hover:shadow-md">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                        <Wrench className="w-4 h-4" />
                        Bay Utilization
                    </CardTitle>
                    <span className={`text-xs font-bold px-2 py-1 rounded 
                ${data.utilization > 80 ? 'bg-red-100 text-red-700' :
                            data.utilization > 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-indigo-100 text-indigo-700'}`}>
                        {data.active} / {data.capacity} Active
                    </span>
                </div>
            </CardHeader>
            <CardContent className="relative flex items-center justify-center p-0 pb-4 h-[180px]">
                {/* Gauge Chart */}
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="80%" // Move down to make it a semicircle
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={activeColor} />
                            <Cell fill="#f1f5f9" />
                        </Pie>
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active }: any) => {
                                if (active) {
                                    return (
                                        <div className="bg-white p-2 border border-slate-100 shadow-xl rounded text-xs text-center">
                                            <p className="font-bold text-slate-700">Service Bays</p>
                                            <p className="text-slate-500">
                                                {data.active} jobs in progress
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Label */}
                <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-center">
                    <p className="text-3xl font-bold text-slate-800">
                        {Math.round(data.utilization)}%
                    </p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
                        Capacity
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
