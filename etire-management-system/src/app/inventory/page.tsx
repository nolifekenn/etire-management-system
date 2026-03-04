"use client";

/**
 * /inventory   Odoo 19-style Inventory Operations Dashboard
 *
 * Shows Kanban-style operation type cards just like Odoo Inventory Overview:
 *    Receipts (pending deliveries from POs)
 *    Purchase Orders (pending / in-progress POs)
 *    Low Stock Items (below reorder_level)
 *    Out of Stock Items
 *
 * Plus a quick-access section to Products and Adjustments.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PackageCheck,
  ShoppingBag,
  AlertTriangle,
  PackageX,
  Box,
  SlidersHorizontal,
  ArrowRight,
  Loader2,
  Package,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getOperationCounts } from "@/lib/actions/inventory";

//  Types 

interface OperationCounts {
  receipts:       number;
  pending_pos:    number;
  low_stock:      number;
  out_of_stock:   number;
  total_products: number;
}

interface OperationCard {
  title:       string;
  description: string;
  icon:        React.ComponentType<{ className?: string }>;
  href:        string;
  count:       number;
  countLabel:  string;
  urgent:      boolean;
  color:       string;
  bg:          string;
}

//  Component 

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [counts, setCounts]   = useState<OperationCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getOperationCounts();
      setCounts(result);
    } catch {
      toast({ title: "Failed to load inventory overview", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards: OperationCard[] = counts ? [
    {
      title:       "Receipts",
      description: "View and print receipts from all completed sales",
      icon:        PackageCheck,
      href:        "/inventory/receipts",
      count:       counts.receipts,
      countLabel:  counts.receipts === 1 ? "Sale" : "Sales",
      urgent:      false,
      color:       "text-blue-700",
      bg:          "bg-blue-50 border-blue-200",
    },
    {
      title:       "Purchase Orders",
      description: "Active purchase orders awaiting delivery",
      icon:        ShoppingBag,
      href:        "/purchasing",
      count:       counts.pending_pos,
      countLabel:  "In Progress",
      urgent:      counts.pending_pos > 0,
      color:       "text-purple-700",
      bg:          "bg-purple-50 border-purple-200",
    },
    {
      title:       "Low Stock Alerts",
      description: "Products below their reorder level",
      icon:        AlertTriangle,
      href:        "/inventory/products?filter=low_stock",
      count:       counts.low_stock,
      countLabel:  "Products",
      urgent:      counts.low_stock > 0,
      color:       "text-amber-700",
      bg:          "bg-amber-50 border-amber-200",
    },
    {
      title:       "Out of Stock",
      description: "Products with zero quantity on hand",
      icon:        PackageX,
      href:        "/inventory/products?filter=out_of_stock",
      count:       counts.out_of_stock,
      countLabel:  "Products",
      urgent:      counts.out_of_stock > 0,
      color:       "text-red-700",
      bg:          "bg-red-50 border-red-200",
    },
  ] : [];

  const quickLinks = [
    {
      title:       "All Products",
      description: "Browse and manage product master data",
      icon:        Box,
      href:        "/inventory/products",
      color:       "text-slate-700",
    },
    {
      title:       "Inventory Adjustments",
      description: "Perform cycle counts and stock corrections",
      icon:        SlidersHorizontal,
      href:        "/inventory/adjustments",
      color:       "text-teal-700",
    },
    {
      title:       "Stock Forecast",
      description: "View demand forecasting and reorder suggestions",
      icon:        BarChart2,
      href:        "/inventory/forecast",
      color:       "text-indigo-700",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of operations, stock levels, and product master data
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Operations Kanban */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Operations
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading operations overview</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  onClick={() => router.push(card.href)}
                  className={`
                    group relative text-left rounded-xl border-2 p-5 transition-all duration-200
                    hover:shadow-md hover:scale-[1.02] cursor-pointer
                    ${card.urgent ? card.bg : "bg-card border-border"}
                  `}
                >
                  {/* Urgent dot */}
                  {card.urgent && card.count > 0 && (
                    <span className="absolute top-3 right-3">
                      <span className={`inline-flex h-2.5 w-2.5 rounded-full animate-pulse
                        ${card.color.replace("text-", "bg-")}`} />
                    </span>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${card.bg} border ${
                      card.urgent ? "border-transparent" : "border-border"
                    }`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>

                  <p className="font-semibold text-foreground text-sm">{card.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {card.description}
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className={`text-3xl font-bold ${card.urgent ? card.color : "text-foreground"}`}>
                        {card.count}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{card.countLabel}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Total products stat */}
      {counts && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>
            <strong className="text-foreground">{counts.total_products}</strong> total products in catalogue
          </span>
        </div>
      )}

      {/* Quick-access section */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Master Data &amp; Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Card
                key={link.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(link.href)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${link.color}`} />
                    <CardTitle className="text-sm">{link.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">{link.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
