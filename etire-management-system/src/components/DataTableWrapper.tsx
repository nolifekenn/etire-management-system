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
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

interface DataTableWrapperProps<T> {
  title?: string;
  columns: Column[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
}

export function DataTableWrapper<T>({
  title,
  columns,
  data,
  onEdit,
  onDelete,
  onRowClick,
}: DataTableWrapperProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredData = data;

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <Card className="bg-white border-slate-100 transition-all duration-300 hover:shadow-xl rounded-none overflow-hidden">
      <CardContent className="pb-0 pt-0 px-0">
        {/* Table - completely square with no rounding */}
        <div className="border-0 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-200 hover:bg-slate-50/80">
                  {columns.map((col) => (
                    <TableHead 
                      key={String(col.key)}
                      className={`text-slate-700 font-semibold text-sm uppercase tracking-wide py-3 px-6 ${
                        col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none transition-colors' : ''
                      }`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-2">
                        {col.header}
                        {col.sortable && sortConfig?.key === col.key && (
                          <span className="text-indigo-600 font-bold">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableHead className="text-right text-slate-700 font-semibold text-sm uppercase tracking-wide py-3 px-6">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={columns.length + ((onEdit || onDelete) ? 1 : 0)} 
                      className="text-center py-8 text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center">
                          <MoreHorizontal className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-base font-medium">
                          No data available.
                        </p>
                        <p className="text-xs text-slate-400">
                          No records to display.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((item, index) => (
                    <TableRow 
                      key={(item as any).id || `row-${index}`}
                      className={`
                        border-b border-slate-100 
                        transition-all duration-200 
                        hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30
                        ${onRowClick ? 'cursor-pointer' : ''}
                        ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}
                      `}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((col) => (
                        <TableCell 
                          key={String(col.key)}
                          className="py-3 px-6 text-slate-700"
                        >
                          {col.render
                            ? col.render((item as any)[col.key], item)
                            : String((item as any)[col.key] ?? '')}
                        </TableCell>
                      ))}
                      {(onEdit || onDelete) && (
                        <TableCell className="text-right py-3 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-indigo-100 hover:text-indigo-600 transition-all duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end"
                              className="bg-white border-slate-200 shadow-xl w-48"
                            >
                              {onEdit && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                  }}
                                  className="flex items-center gap-2 py-2 px-3 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-all duration-200"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Item
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item);
                                  }}
                                  className="flex items-center gap-2 py-2 px-3 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all duration-200 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Item
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
    </Card>
  );
}