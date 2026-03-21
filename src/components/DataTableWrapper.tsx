/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: any) => React.ReactNode;
  accessorKey?: string; // For data access path 'user.name'
}

interface DataTableWrapperProps<T> {
  title?: string;
  description?: string;
  columns: Column[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
  className?: string;
  searchKeys?: string[];
  rowsPerPageOptions?: number[];
  rowsPerPage?: number;
  onRowsPerPageChange?: (n: number) => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function DataTableWrapper<T>({
  title,
  // description is part of props interface but not rendered
  columns,
  data,
  onEdit,
  onDelete,
  onRowClick,
  className,
  searchKeys = [],
  rowsPerPageOptions = [5, 10, 25, 50],
  rowsPerPage: externalRowsPerPage,
  onRowsPerPageChange,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  showHeader = true,
  showFooter = true,
}: DataTableWrapperProps<T>) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Use external props if provided, otherwise internal state
  const rowsPerPage = typeof externalRowsPerPage === 'number' ? externalRowsPerPage : internalRowsPerPage;
  const searchTerm = typeof externalSearchTerm === 'string' ? externalSearchTerm : internalSearchTerm;

  const handleSearchChange = (term: string) => {
    if (onSearchTermChange) {
      onSearchTermChange(term);
    } else {
      setInternalSearchTerm(term);
    }
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (val: string) => {
    const num = Number(val);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(num);
    } else {
      setInternalRowsPerPage(num);
    }
    setCurrentPage(1);
  };

  // Helper to get value from key (supports dot notation)
  const getValue = (item: any, key: string) => {
    return key.split('.').reduce((acc, k) => acc?.[k], item);
  };

  // Sorting
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Filter
    if (searchTerm && searchKeys.length > 0) {
      filtered = filtered.filter(item =>
        searchKeys.some(key => {
          const val = getValue(item, key);
          return val ? String(val).toLowerCase().includes(searchTerm.toLowerCase()) : false;
        })
      );
    }

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = getValue(a, sortConfig.key) || (a as Record<string, unknown>)[sortConfig.key];
        const bValue = getValue(b, sortConfig.key) || (b as Record<string, unknown>)[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, searchKeys, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const rangeStart = processedData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(currentPage * rowsPerPage, processedData.length);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <Card className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className || ''}`}>
      {showHeader && (
        <CardHeader className="pb-4 pt-5 px-6 flex flex-row items-center justify-between border-b border-slate-200">
          <div className="flex flex-col gap-1">
            {title && <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>}
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            {searchKeys.length > 0 && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                />
              </div>
            )}
            <span className="text-xs font-medium text-slate-500">
              {processedData.length.toLocaleString()} item{processedData.length === 1 ? '' : 's'}
            </span>
          </div>
        </CardHeader>
      )}

      <CardContent className="pb-0 pt-0 px-0">
        {/* Table */}
        <div className="border-0 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  {columns.map((col) => {
                    const sortKey = col.accessorKey || col.key;
                    return (
                      <TableHead
                        key={String(col.key)}
                        className={`text-slate-600 font-semibold text-xs uppercase tracking-wider py-3 px-4 h-10 ${col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none transition-colors' : ''
                          } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                        onClick={() => col.sortable && handleSort(sortKey)}
                      >
                        <div className={`flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                          }`}>
                          {col.header}
                          {col.sortable && sortConfig?.key === sortKey && (
                            <span className="text-indigo-600 font-bold">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                  {(onEdit || onDelete) && (
                    <TableHead className="text-right text-slate-700 font-semibold text-xs uppercase tracking-wider py-3 px-4 h-10">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + ((onEdit || onDelete) ? 1 : 0)}
                      className="text-center py-12 text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-full mb-2">
                          <MoreHorizontal className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-base font-medium text-slate-600">
                          No {title?.toLowerCase() || 'records'} found
                        </p>
                        <p className="text-xs text-slate-400">
                          {searchTerm ? `No matches for "${searchTerm}"` : 'Get started by adding a new record'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, index) => (
                    <TableRow
                      key={(item as Record<string, unknown>).id as string || (item as Record<string, unknown>).key as string || `row-${index}`}
                      className={`
                        border-b border-slate-100
                        transition-colors duration-150
                        hover:bg-slate-50
                        ${onRowClick ? 'cursor-pointer' : ''}
                      `}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((col) => {
                        const sortKey = col.accessorKey || col.key;
                        const cellValue = getValue(item, sortKey) || (item as Record<string, unknown>)[col.key];
                        return (
                          <TableCell
                            key={String(col.key)}
                            className={`py-3 px-4 text-sm text-slate-600 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                              }`}
                          >
                            {col.render
                              ? col.render(cellValue, item)
                              : String(cellValue ?? '')}
                          </TableCell>
                        );
                      })}
                      {(onEdit || onDelete) && (
                        <TableCell className="text-right py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white border-slate-200 shadow-lg w-48"
                            >
                              {onEdit && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                  }}
                                  className="flex items-center gap-2 py-2.5 px-3 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer text-sm font-medium"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Record
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item);
                                  }}
                                  className="flex items-center gap-2 py-2.5 px-3 hover:bg-red-50 hover:text-red-600 cursor-pointer text-sm font-medium text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Record
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Pagination Footer */}
      {showFooter && processedData.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Showing {rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()} of {processedData.length.toLocaleString()}
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={handleRowsPerPageChange}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rowsPerPageOptions.map(opt => (
                    <SelectItem key={opt} value={String(opt)} className="text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-white hover:text-indigo-600"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 hover:bg-white hover:text-indigo-600"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}