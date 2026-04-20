/* ────────────────────────────────────────────────────────────────────────────
 * src/app/dashboard/page.tsx
 * Phase 3 — Executive Dashboard
 * KPI scorecards · Revenue vs COGS bar chart · Inventory donut ·
 * Workshop analytics — all figures derived from the Phase 2 ledger.
 * ──────────────────────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign, Package, ShoppingCart, Wrench,
  TrendingUp, TrendingDown, RefreshCw, Loader2,
  ArrowUpRight, BarChart2, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import {
  getExecutiveSummary,
  getRevenueCOGSChart,
  getInventoryByCategory,
  getWorkshopAnalytics,
  type ExecutiveSummary,
  type RevenueCOGSPoint,
  type InventoryCategoryPoint,
  type WorkshopAnalytics,
} from '@/lib/actions/analytics';

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

const fmtCompact = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `₱${(n / 1_000).toFixed(1)}K`
    : `₱${n.toFixed(0)}`;

// ── KPI Card Component ────────────────────────────────────────────────────────

interface KpiCardProps {
  title:     string;
  value:     string;
  subtitle?: string;
  trend?:    number | null;    // % change (positive = good)
  icon:      React.ReactNode;
  href?:     string;
  loading?:  boolean;
  color?:    string;           // tailwind ring color class
}

function KpiCard({ title, value, subtitle, trend, icon, href, loading, color = 'ring-blue-500/20' }: KpiCardProps) {
  const content = (
    <Card className={`relative overflow-hidden border ring-1 ${color} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground/60">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-xl sm:text-2xl font-bold tracking-tight break-words">{value}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {subtitle && <p className="text-xs text-muted-foreground break-words">{subtitle}</p>}
              {trend != null && (
                <Badge
                  variant="outline"
                  className={`text-[10px] sm:text-xs px-1 py-0 ${trend >= 0 ? 'text-emerald-600 border-emerald-300' : 'text-red-500 border-red-300'}`}
                >
                  {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5 inline" /> : <TrendingDown className="h-3 w-3 mr-0.5 inline" />}
                  {Math.abs(trend).toFixed(1)}% MoM
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
      {href && <ArrowUpRight className="absolute top-3 right-3 h-4 w-4 text-muted-foreground/40" />}
    </Card>
  );

  return href ? <Link href={href} className="block group">{content}</Link> : content;
}

// ── Custom Tooltip for Revenue/COGS chart ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtCompact(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Custom Tooltip for donut chart ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">Value: {fmt(d.value)}</p>
      <p className="text-muted-foreground">SKUs: {d.payload.count}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, activeBranchId } = useAuth();

  const canAccessPath = (role: string | undefined, path: string) => {
    if (!role) return false;
    if (role === 'super_admin') return true;

    const allowedPrefixesByRole: Record<string, string[]> = {
      branch_manager: [
        '/',
        '/dashboard',
        '/inventory',
        '/pos',
        '/services',
        '/customers',
        '/purchasing',
        '/reports',
        '/branches',
        '/backup',
        '/settings',
        '/admin',
        '/sales',
        '/receipt',
      ],
      staff: [
        '/',
        '/dashboard',
        '/inventory',
        '/pos',
        '/services',
        '/customers',
        '/purchasing',
        '/receipt',
      ],
      cashier: [
        '/',
        '/dashboard',
        '/pos',
        '/customers',
        '/receipt',
      ],
      mechanic: [
        '/',
        '/dashboard',
        '/services',
        '/receipt',
      ],
    };

    const allowedPrefixes = allowedPrefixesByRole[role] ?? [];
    return allowedPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
  };

  const [chartDays,    setChartDays]    = useState<number>(30);
  const [summary,      setSummary]      = useState<ExecutiveSummary | null>(null);
  const [chartData,    setChartData]    = useState<RevenueCOGSPoint[]>([]);
  const [donutData,    setDonutData]    = useState<(InventoryCategoryPoint & Record<string, unknown>)[]>([]);
  const [workshop,     setWorkshop]     = useState<WorkshopAnalytics | null>(null);
  const [loadingKPIs,  setLoadingKPIs]  = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingDonut, setLoadingDonut] = useState(true);
  const [loadingWS,    setLoadingWS]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [lastRefresh,  setLastRefresh]  = useState<Date>(new Date());

  const branchFilter = activeBranchId ? { branch_id: activeBranchId } : {};

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchKPIs = useCallback(async () => {
    setLoadingKPIs(true);
    const res = await getExecutiveSummary(branchFilter);
    if (res.success) setSummary(res.data);
    else setError(res.error ?? 'Failed to load KPIs');
    setLoadingKPIs(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const fetchChart = useCallback(async () => {
    setLoadingChart(true);
    const res = await getRevenueCOGSChart({ ...branchFilter, days: chartDays });
    if (res.success) setChartData(res.data);
    setLoadingChart(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, chartDays]);

  const fetchDonut = useCallback(async () => {
    setLoadingDonut(true);
    const res = await getInventoryByCategory(branchFilter);
    if (res.success) setDonutData(res.data as (InventoryCategoryPoint & Record<string, unknown>)[]);
    setLoadingDonut(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const fetchWorkshop = useCallback(async () => {
    setLoadingWS(true);
    const res = await getWorkshopAnalytics(branchFilter);
    if (res.success) setWorkshop(res.data);
    setLoadingWS(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const refresh = useCallback(() => {
    setError(null);
    setLastRefresh(new Date());
    fetchKPIs();
    fetchChart();
    fetchDonut();
    fetchWorkshop();
  }, [fetchKPIs, fetchChart, fetchDonut, fetchWorkshop]);

  useEffect(() => { fetchKPIs(); fetchDonut(); fetchWorkshop(); }, [fetchKPIs, fetchDonut, fetchWorkshop]);
  useEffect(() => { fetchChart(); }, [fetchChart]);

  // ── Derived values ────────────────────────────────────────────────────────

  const totalChartRevenue = chartData.reduce((a, r) => a + r.revenue, 0);
  const totalChartCOGS    = chartData.reduce((a, r) => a + r.cogs, 0);
  const grossMarginPct    = totalChartRevenue > 0
    ? ((totalChartRevenue - totalChartCOGS) / totalChartRevenue * 100).toFixed(1)
    : '—';

  const totalInventoryValue = donutData.reduce((a, d) => a + d.value, 0);

  // Thin out X-axis labels when showing 30+ days
  const xAxisInterval = chartDays <= 14 ? 0 : chartDays <= 30 ? 4 : 6;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Last refreshed: {lastRefresh.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            {activeBranchId && <span className="ml-2 text-xs text-muted-foreground">· Branch filtered</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5 w-full sm:w-auto">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          {canAccessPath(user?.role, '/reports') && (
            <Link href="/reports">
              <Button size="sm" className="gap-1.5 w-full sm:w-auto">
                <BarChart2 className="h-3.5 w-3.5" />
                Full Reports
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Business Income"
          value={loadingKPIs ? '…' : fmtCompact(summary?.total_business_income ?? 0)}
          subtitle={loadingKPIs ? undefined : `Sales ${fmtCompact(summary?.total_sales_revenue ?? 0)} + Services ${fmtCompact(summary?.total_service_revenue ?? 0)}`}
          icon={<DollarSign className="h-4 w-4" />}
          loading={loadingKPIs}
          color="ring-emerald-500/20"
        />
        <KpiCard
          title="Total Sales Revenue"
          value={loadingKPIs ? '…' : fmtCompact(summary?.total_sales_revenue ?? 0)}
          subtitle={loadingKPIs ? undefined : `${summary?.total_sales_count ?? 0} transactions`}
          trend={summary?.revenue_mom_pct ?? null}
          icon={<DollarSign className="h-4 w-4" />}
          href={canAccessPath(user?.role, '/sales') ? '/sales' : undefined}
          loading={loadingKPIs}
          color="ring-blue-500/20"
        />
        <KpiCard
          title="Inventory Value"
          value={loadingKPIs ? '…' : fmtCompact(summary?.inventory_value ?? 0)}
          subtitle={loadingKPIs ? undefined : `${summary?.inventory_item_count ?? 0} SKUs on hand`}
          icon={<Package className="h-4 w-4" />}
          href={canAccessPath(user?.role, '/inventory') ? '/inventory' : undefined}
          loading={loadingKPIs}
          color="ring-emerald-500/20"
        />
        <KpiCard
          title="Open Purchase Orders"
          value={loadingKPIs ? '…' : String(summary?.open_pos_count ?? 0)}
          subtitle="Awaiting receipt / approval"
          icon={<ShoppingCart className="h-4 w-4" />}
          href={canAccessPath(user?.role, '/purchasing') ? '/purchasing?filter=status:pending' : undefined}
          loading={loadingKPIs}
          color="ring-amber-500/20"
        />
        <KpiCard
          title="Pending Services"
          value={loadingKPIs ? '…' : String(summary?.pending_services ?? 0)}
          subtitle="Quotation · In-Progress · QC"
          icon={<Wrench className="h-4 w-4" />}
          href={canAccessPath(user?.role, '/services') ? '/services' : undefined}
          loading={loadingKPIs}
          color="ring-violet-500/20"
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue vs COGS bar chart (2/3 width) */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Revenue vs COGS</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Gross Margin: <span className="font-semibold text-foreground">{grossMarginPct}%</span>
                  {' · '}Revenue: <span className="font-semibold">{fmtCompact(totalChartRevenue)}</span>
                  {' · '}COGS: <span className="font-semibold">{fmtCompact(totalChartCOGS)}</span>
                </p>
              </div>
              <Select
                value={String(chartDays)}
                onValueChange={v => setChartDays(Number(v))}
              >
                <SelectTrigger className="h-7 w-full sm:w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No sales data in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    width={38}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cogs"    name="COGS"    fill="#f97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory by Category donut (1/3 width) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inventory by Category</CardTitle>
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{fmtCompact(totalInventoryValue)}</span>
            </p>
          </CardHeader>
          <CardContent>
            {loadingDonut ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : donutData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                No inventory data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="45%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                    iconSize={8}
                    iconType="circle"
                  />
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Workshop Analytics Row ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-violet-500" />
                Workshop Analytics
                <Badge variant="outline" className="text-xs ml-1">Completed Jobs</Badge>
              </CardTitle>
            {canAccessPath(user?.role, '/services') && (
              <Link href="/services/list?state=completed">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingWS ? (
            <div className="h-16 flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !workshop ? (
            <p className="text-sm text-muted-foreground">No workshop data available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <WorkshopStat label="Completed Jobs"   value={String(workshop.total_jobs_completed)} />
              <WorkshopStat label="Total Revenue"    value={fmtCompact(workshop.total_revenue)} />
              <WorkshopStat label="Parts Revenue"    value={fmtCompact(workshop.parts_revenue)} color="text-blue-600" />
              <WorkshopStat label="Labor Revenue"    value={fmtCompact(workshop.labor_revenue)} color="text-violet-600" />
              <WorkshopStat label="Avg Job Value"    value={fmtCompact(workshop.avg_job_value)} />
              <WorkshopStat
                label="Stock Consumed"
                value={fmtCompact(workshop.inventory_consumed_value)}
                color="text-orange-600"
                note="at cost"
              />
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

// ── Mini stat block used in Workshop row ─────────────────────────────────────

function WorkshopStat({
  label, value, color = 'text-foreground', note,
}: {
  label: string; value: string; color?: string; note?: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {note && <p className="text-[10px] text-muted-foreground/60">{note}</p>}
    </div>
  );
}
