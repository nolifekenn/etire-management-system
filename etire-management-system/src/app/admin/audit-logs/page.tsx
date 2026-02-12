"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
    Loader2,
    Search,
    ShieldAlert,
    Filter,
    Calendar,
    FileText,
    User,
    Database,
    ArrowUpDown
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
    log_id: string;
    user_id: string;
    action: string;
    table_name: string;
    record_id?: string;
    new_values?: any;
    created_at: string;
    user?: {
        name: string;
        username: string;
        role: string;
    };
}

export default function AuditLogsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        if (!authLoading) {
            if (!user || (user.role !== 'super_admin' && user.role !== 'branch_manager')) {
                toast({
                    title: "Access Denied",
                    description: "You do not have permission to view audit logs.",
                    variant: "destructive"
                });
                router.push('/dashboard');
            } else {
                fetchLogs();
            }
        }
    }, [user, authLoading, router, toast]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // Join with user table to get user details
            const { data, error } = await supabase
                .from('audit_log')
                .select(`
          *,
          user:user_id (
            name,
            username,
            role
          )
        `)
                .order('created_at', { ascending: false })
                .limit(500); // Limit to recent 500 logs for performance

            if (error) throw error;
            setLogs(data || []);
        } catch (error: any) {
            console.error('Error fetching logs:', error);
            toast({
                title: "Error",
                description: "Failed to load audit logs.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formattedLogs = useMemo(() => {
        // Client-side filtering
        if (!searchTerm) return logs;
        const term = searchTerm.toLowerCase();
        return logs.filter(log =>
            log.action.toLowerCase().includes(term) ||
            log.table_name.toLowerCase().includes(term) ||
            log.user?.name.toLowerCase().includes(term) ||
            (log.new_values && JSON.stringify(log.new_values).toLowerCase().includes(term))
        );
    }, [logs, searchTerm]);

    const columns = [
        {
            key: 'created_at',
            header: 'Timestamp',
            accessorKey: 'created_at',
            sortable: true,
            cell: (item: AuditLog) => (
                <span className="text-xs text-slate-500 font-medium">
                    {new Date(item.created_at).toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                </span>
            )
        },
        {
            key: 'user_name',
            header: 'User',
            accessorKey: 'user.name',
            sortable: true,
            cell: (item: AuditLog) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-700">{item.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-slate-400">{item.user?.role || 'N/A'}</span>
                </div>
            )
        },
        {
            key: 'action',
            header: 'Action',
            accessorKey: 'action',
            sortable: true,
            cell: (item: AuditLog) => {
                const color = item.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                    item.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        item.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
                return (
                    <Badge className={`${color} border-0`}>{item.action}</Badge>
                );
            }
        },
        {
            key: 'table_name',
            header: 'Entity / Table',
            accessorKey: 'table_name',
            sortable: true,
            cell: (item: AuditLog) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Database className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{item.table_name}</span>
                </div>
            )
        },
        {
            key: 'new_values',
            header: 'Details',
            accessorKey: 'new_values',
            cell: (item: AuditLog) => (
                <div className="max-w-[300px] truncate text-xs text-slate-500" title={JSON.stringify(item.new_values, null, 2)}>
                    {item.new_values ? JSON.stringify(item.new_values) : '-'}
                </div>
            )
        }
    ];

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="w-full px-3 py-4 space-y-4">
                {/* Compact Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold text-foreground">
                            Audit Logs
                        </h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchLogs}>
                        <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Filters */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search logs by action, user, or details..."
                                className="pl-9 bg-white border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Add more filters here if needed (Date Range, Action Type) */}
                    </CardContent>
                </Card>

                {/* Logs Table */}
                <Card className="border-slate-200 shadow-lg overflow-hidden">
                    <DataTableWrapper
                        data={formattedLogs}
                        columns={columns}
                        searchKeys={['action', 'table_name', 'user.name']}
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={setRowsPerPage}
                    />
                </Card>
            </div>
        </div>
    );
}
