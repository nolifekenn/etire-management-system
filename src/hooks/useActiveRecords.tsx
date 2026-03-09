"use client";

import { supabase } from "@/lib/supabaseClient";

/**
 * Tables that support soft delete (have deleted_at column)
 */
export const SOFT_DELETE_TABLES = [
    'branch',
    'catalog_item',
    'inventory_item',
    'customer',
    'sale',
    'service_job',
    'supplier',
    'user',
    'vehicle',
    'notification',
] as const;

export type SoftDeleteTable = typeof SOFT_DELETE_TABLES[number];

/**
 * Soft delete helper - updates deleted_at instead of hard deleting
 * @param tableName - The table to soft delete from
 * @param idColumn - The primary key column name
 * @param idValue - The value of the primary key to delete
 */
export async function softDelete(
    tableName: SoftDeleteTable,
    idColumn: string,
    idValue: string
) {
    if (!supabase) throw new Error('Supabase client not available');

    return await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .eq(idColumn, idValue);
}

/**
 * Batch soft delete helper - soft deletes multiple records
 * @param tableName - The table to soft delete from
 * @param idColumn - The primary key column name
 * @param idValues - Array of primary key values to delete
 */
export async function softDeleteMany(
    tableName: SoftDeleteTable,
    idColumn: string,
    idValues: string[]
) {
    if (!supabase) throw new Error('Supabase client not available');
    if (idValues.length === 0) return { error: null, data: null };

    return await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .in(idColumn, idValues);
}

/**
 * Fetch active records with automatic soft-delete filtering
 * @param tableName - Table to query
 * @param selectColumns - Columns to select
 * @param orderBy - Optional column to order by
 * @param ascending - Order direction (default: true)
 */
export async function fetchActiveRecords(
    tableName: string,
    selectColumns: string = '*',
    orderBy?: string,
    ascending: boolean = true
): Promise<{ data: Record<string, unknown>[] | null; error: unknown }> {
    if (!supabase) return { data: null, error: new Error('Supabase client not available') };

    let query = supabase
        .from(tableName)
        .select(selectColumns)
        .is('deleted_at', null);

    if (orderBy) {
        query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;
    return { data, error };
}

/**
 * Create a query builder that filters out soft-deleted records
 * @param tableName - Table name to query
 * @param selectColumns - Columns to select (default: '*')
 */
export function getActiveQuery(tableName: string, selectColumns: string = '*') {
    if (!supabase) throw new Error('Supabase client not available');

    return supabase
        .from(tableName)
        .select(selectColumns)
        .is('deleted_at', null);
}

/**
 * Hook to get active (non-deleted) records utilities
 * Provides methods for querying and deleting records with soft-delete support
 */
export function useActiveRecords() {
    return {
        getActiveQuery,
        fetchActiveRecords,
        softDelete,
        softDeleteMany,
    };
}

/**
 * Utility to check if a table supports soft delete
 */
export function isSoftDeleteTable(tableName: string): tableName is SoftDeleteTable {
    return SOFT_DELETE_TABLES.includes(tableName as SoftDeleteTable);
}
