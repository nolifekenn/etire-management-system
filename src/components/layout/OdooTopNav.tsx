"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Building2 as GitBranchIcon,
  LayoutDashboard,
  Package,
  Tag,
  SlidersHorizontal,
  FileInput,
  ShoppingCart,
  ShoppingBag,
  Monitor,
  Users,
  Wrench,
  BarChart3,
  Database,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth }               from "@/hooks/useAuth";
import { Avatar, AvatarFallback }from "@/components/ui/avatar";
import { OdooAppSwitcher }       from "@/components/layout/OdooAppSwitcher";
import { cn }                    from "@/lib/utils";
import { ROLE_NAMES }            from "@/hooks/useRoleAccess";
import { Notification }          from "@/lib/types";
import { supabase }              from "@/lib/supabaseClient";
import {
  getMyNotifications,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifIcon({ type }: { type: Notification["type"] }) {
  if (type === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  if (type === "error")   return <XCircle       className="h-4 w-4 text-red-500   shrink-0" />;
  if (type === "success") return <CheckCircle   className="h-4 w-4 text-green-500 shrink-0" />;
  return                         <Info          className="h-4 w-4 text-blue-500  shrink-0" />;
}

export function OdooTopNav({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout, activeBranchId, setActiveBranchId } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Branch Switcher (super_admin only) ────────────────────────────────
  const [branches, setBranches] = useState<{ branch_id: string; name: string }[]>([]);

  useEffect(() => {
    if (!supabase || user?.role !== 'super_admin') return;
    supabase
      .from('branch')
      .select('branch_id, name')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .then(({ data }) => { if (data) setBranches(data); });
  }, [user?.role]);

  // ── Notifications ──────────────────────────────────────────────────────
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [notifications,setNotifications] = useState<Notification[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user?.user_id) return;
    setNotifLoading(true);
    const res = await getMyNotifications(user.user_id, 25);
    setNotifications(res.notifications);
    setUnreadCount(res.unreadCount);
    setNotifLoading(false);
  }, [user?.user_id]);

  // Initial load + refresh every 60 s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark all read + reload when dropdown opens
  const handleNotifOpen = async () => {
    setNotifOpen(v => !v);
    if (!notifOpen && user?.user_id && unreadCount > 0) {
      await markAllNotificationsRead(user.user_id);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  // Close notif dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [notifOpen]);

  // Close user menu on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  // ── Command Palette ──────────────────────────────────────────────────────
  interface NavItem { id: string; label: string; desc: string; href: string; icon: React.ReactNode; tags: string; }
  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard',    label: 'Dashboard',         desc: 'Overview and key metrics',           href: '/dashboard',             icon: <LayoutDashboard   className="h-4 w-4 text-indigo-500" />,  tags: 'home overview stats analytics' },
    { id: 'inventory',    label: 'Inventory',          desc: 'Stock levels and management',        href: '/inventory',             icon: <Package           className="h-4 w-4 text-emerald-500" />, tags: 'stock tires items' },
    { id: 'products',     label: 'Products',           desc: 'Product catalog and pricing',        href: '/inventory/products',    icon: <Tag               className="h-4 w-4 text-emerald-400" />, tags: 'catalog sku pricing' },
    { id: 'adj',          label: 'Stock Adjustments',  desc: 'Adjust stock levels manually',       href: '/inventory/adjustments', icon: <SlidersHorizontal className="h-4 w-4 text-teal-500" />,    tags: 'adjust stock correction' },
    { id: 'inv-receipts', label: 'Receipts',           desc: 'Receive incoming stock',             href: '/inventory/receipts',    icon: <FileInput         className="h-4 w-4 text-teal-400" />,    tags: 'receive incoming delivery' },
    { id: 'purchasing',   label: 'Purchasing',         desc: 'Purchase orders, RFQs, vendors',     href: '/purchasing',            icon: <ShoppingCart      className="h-4 w-4 text-sky-500" />,     tags: 'vendors rfq po order buy' },
    { id: 'sales',        label: 'Sales',              desc: 'Sales orders and transactions',      href: '/sales',                 icon: <ShoppingBag       className="h-4 w-4 text-violet-500" />,  tags: 'orders so invoice sell' },
    { id: 'pos',          label: 'Point of Sale',      desc: 'POS cashier terminal',               href: '/pos',                   icon: <Monitor           className="h-4 w-4 text-pink-500" />,    tags: 'cashier register checkout' },
    { id: 'customers',    label: 'Customers',          desc: 'Customer records and vehicles',      href: '/customers',             icon: <Users             className="h-4 w-4 text-orange-500" />,  tags: 'clients vehicles plates cars' },
    { id: 'services',     label: 'Services',           desc: 'Job cards and work orders',          href: '/services',              icon: <Wrench            className="h-4 w-4 text-amber-500" />,   tags: 'repairs jobs vulcanizing tire' },
    { id: 'reports',      label: 'Reports',            desc: 'Sales and inventory reports',        href: '/reports',               icon: <BarChart3         className="h-4 w-4 text-blue-500" />,    tags: 'analytics export print statistics' },
    { id: 'branches',     label: 'Branches',           desc: 'Manage branch locations',            href: '/branches',              icon: <GitBranchIcon     className="h-4 w-4 text-stone-500" />,   tags: 'locations stores shop' },
    { id: 'settings',     label: 'Settings',           desc: 'Account and system settings',        href: '/settings',              icon: <Settings          className="h-4 w-4 text-slate-500" />,   tags: 'profile account password preferences' },
    { id: 'backup',       label: 'Backup',             desc: 'Database backup and export',         href: '/backup',                icon: <Database          className="h-4 w-4 text-neutral-500" />, tags: 'export data' },
  ];

  const q = searchValue.toLowerCase().trim();
  const searchResults = q
    ? NAV_ITEMS.filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q) ||
        n.tags.toLowerCase().includes(q)
      )
    : NAV_ITEMS;

  // Reset highlight when query changes
  useEffect(() => setHighlightedIdx(0), [searchValue]);

  // Press "/" anywhere (outside inputs) to focus search
  useEffect(() => {
    function onSlash(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onSlash);
    return () => document.removeEventListener('keydown', onSlash);
  }, []);

  // Close command palette on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [searchOpen]);

  function navigateTo(href: string) {
    router.push(href);
    setSearchOpen(false);
    setSearchValue('');
    searchInputRef.current?.blur();
  }

  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (searchResults[highlightedIdx]) navigateTo(searchResults[highlightedIdx].href);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchValue('');
      searchInputRef.current?.blur();
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[52px] items-center gap-3 border-b border-white/10 bg-[#714B67] px-3 shadow-sm">
      {/* ── Left: Hamburger (mobile) + App Switcher + Brand ──────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Hamburger — hidden now that sidebar is removed */}

        <OdooAppSwitcher />
        <Link
          href="/dashboard"
          className="hidden sm:flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10 transition-colors"
        >
          {/* Mini logo tile */}
          <div className="flex h-7 w-7 items-center justify-center rounded bg-white/20">
            <span className="text-xs font-bold text-white">eT</span>
          </div>
          <span className="text-sm font-semibold text-white leading-none">
            eTire<span className="font-light opacity-80"> MIS</span>
          </span>
        </Link>

        {/* Vertical divider */}
        <div className="hidden sm:block h-5 w-px bg-white/20" />
      </div>

      {/* ── Center: Command Palette ──────────────────────────────── */}
      <div className="flex-1 max-w-xl mx-auto relative" ref={searchContainerRef}>
        {/* Mobile: icon-only toggle; expands to full bar when tapped */}
        <button
          className="flex sm:hidden h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* Desktop: always visible input bar */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-2 rounded-md border transition-all px-3 h-8 cursor-text",
            searchOpen || searchValue
              ? "border-white/60 bg-white/20 text-white"
              : "border-white/20 bg-white/10 text-white/70"
          )}
          onClick={() => { setSearchOpen(true); searchInputRef.current?.focus(); }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search pages…"
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKey}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50 text-white"
          />
          {searchValue ? (
            <button
              onClick={(e) => { e.stopPropagation(); setSearchValue(''); searchInputRef.current?.focus(); }}
              className="text-white/50 hover:text-white transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex h-5 select-none items-center rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] text-white/50">/</kbd>
          )}
        </div>

        {/* Mobile full-screen search overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-[70] flex flex-col bg-white sm:hidden">
            {/* Mobile search header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-[#714B67]">
              <Search className="h-4 w-4 text-white/70 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search pages…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchKey}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50 text-white"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchValue(''); }}
                className="text-white/70 hover:text-white transition-colors px-1"
              >
                Cancel
              </button>
            </div>
            {/* Mobile results */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Search className="h-8 w-8 opacity-20" />
                  <span className="text-sm">No results for &ldquo;{searchValue}&rdquo;</span>
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0",
                      idx === highlightedIdx ? "bg-[#714B67]/10" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Desktop dropdown */}
        {searchOpen && (
          <div className="hidden sm:block absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg shadow-2xl border border-border z-[60] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-slate-50">
              <span className="text-[11px] text-muted-foreground font-medium">
                {q ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchValue}"` : 'All pages'}
              </span>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground select-none">
                <span><kbd className="border border-slate-200 rounded px-1 bg-white">↑↓</kbd> move</span>
                <span><kbd className="border border-slate-200 rounded px-1 bg-white">↵</kbd> open</span>
                <span><kbd className="border border-slate-200 rounded px-1 bg-white">Esc</kbd> close</span>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <Search className="h-8 w-8 opacity-20" />
                  <span className="text-sm">No results for &ldquo;{searchValue}&rdquo;</span>
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.href)}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/30 last:border-0",
                      idx === highlightedIdx ? "bg-[#714B67]/10" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium leading-tight", idx === highlightedIdx ? "text-[#714B67]" : "text-foreground")}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:block font-mono">{item.href}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Branch Switcher (super_admin only) ──────────────────── */}
      {user?.role === 'super_admin' && branches.length > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <GitBranchIcon className="h-3.5 w-3.5 text-white/60 shrink-0" />
          <select
            value={activeBranchId ?? ''}
            onChange={(e) => setActiveBranchId(e.target.value)}
            className="h-8 rounded-md border border-white/25 bg-white/10 px-2 text-xs text-white
                       focus:outline-none focus:border-white/60 cursor-pointer
                       [&>option]:bg-[#714B67] [&>option]:text-white"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Right: Actions + User ────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifOpen}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 rounded-lg border border-border bg-white shadow-lg z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                {unreadCount === 0 && notifications.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">All caught up</span>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-30" />
                    <span className="text-sm">No notifications yet</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.notification_id}
                      className={cn(
                        "flex gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors",
                        !n.is_read && "bg-amber-50",
                      )}
                    >
                      <div className="mt-0.5">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs leading-snug text-foreground", !n.is_read && "font-semibold")}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-border px-3 py-2">
                  <button
                    onClick={async () => {
                      if (user?.user_id) {
                        await markAllNotificationsRead(user.user_id);
                        setUnreadCount(0);
                        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                      }
                    }}
                    className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings shortcut */}
        {user?.role && ["super_admin", "branch_manager"].includes(user.role) && (
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}

        {/* Admin shortcut for super_admin */}
        {user?.role === "super_admin" && (
          <Link
            href="/admin"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Admin"
          >
            <Shield className="h-4 w-4" />
          </Link>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-white/20 mx-1" />

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10 transition-colors"
            aria-label="User menu"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-semibold text-white leading-none">
                {user?.name ?? "..."}
              </p>
              <p className="text-[10px] text-white/60 leading-none mt-0.5">
                {user?.role ? ROLE_NAMES[user.role as keyof typeof ROLE_NAMES] : ""}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-white/60 transition-transform",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-white shadow-lg z-50 overflow-hidden">
              {/* User info header */}
              <div className="flex items-center gap-3 border-b border-border p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user?.username}
                  </p>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {/* User details */}
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium text-foreground capitalize">
                      {user?.role ? ROLE_NAMES[user.role as keyof typeof ROLE_NAMES] : "—"}
                    </span>
                  </div>
                  {user?.branch_id && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Branch&nbsp;ID</span>
                      <span className="font-mono text-foreground">{user.branch_id.slice(0, 8)}…</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">User&nbsp;ID</span>
                    <span className="font-mono text-foreground">{(user?.user_id ?? "").slice(0, 8)}…</span>
                  </div>
                </div>

                <div className="border-t border-border my-1" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
