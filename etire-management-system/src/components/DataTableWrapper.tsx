"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreHorizontal, 
  PlusCircle, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

interface DataTableWrapperProps<T> {
  title: string;
  columns: Column[];
  data: (T & { id: string | number })[];
  rowsPerPageOptions?: number[];
  onAddNew?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRowClick?: (item: T) => void;
  onViewMore?: () => void; // New prop for View More functionality
}

export function DataTableWrapper<T>({
  title,
  columns,
  data,
  rowsPerPageOptions = [5, 10, 25, 50],
  onAddNew,
  onEdit,
  onDelete,
  onRowClick,
  onViewMore, // New prop
}: DataTableWrapperProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // No more filtering logic - we use the data directly
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

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset to page 1 when rows per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-200 p-6">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        
        {/* Header Controls - Rows per page dropdown and buttons */}
        <div className="flex items-center gap-4">
          {/* Rows Per Page Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
              <SelectTrigger className="w-20 border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rowsPerPageOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* View More Button */}
            {onViewMore && (
              <Button 
                onClick={onViewMore}
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <Eye className="mr-2 h-4 w-4" /> 
                View More
              </Button>
            )}
            
            {/* Add New Button */}
            {onAddNew && (
              <Button 
                onClick={onAddNew}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> 
                Add New
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Remove top, left, and right padding from CardContent - only keep bottom padding */}
      <CardContent className="pb-6 pt-0 px-0">
        {/* Table */}
        <div className="border-0 rounded-none bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-200 hover:bg-slate-50/80">
                  {columns.map((col) => (
                    <TableHead 
                      key={String(col.key)}
                      className={`text-slate-700 font-semibold text-sm uppercase tracking-wide py-4 px-6 ${
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
                    <TableHead className="text-right text-slate-700 font-semibold text-sm uppercase tracking-wide py-4 px-6">
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
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                          <PlusCircle className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-medium">
                          No data available.
                        </p>
                        <p className="text-sm text-slate-400">
                          Get started by adding your first item.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, index) => (
                    <TableRow 
                      key={item.id}
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
                          className="py-4 px-6 text-slate-700"
                        >
                          {col.render
                            ? col.render((item as any)[col.key], item)
                            : String((item as any)[col.key] ?? '')}
                        </TableCell>
                      ))}
                      {(onEdit || onDelete) && (
                        <TableCell className="text-right py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0 hover:bg-indigo-100 hover:text-indigo-600 transition-all duration-200 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end"
                              className="bg-white border-slate-200 shadow-xl rounded-xl w-48"
                            >
                              {onEdit && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                  }}
                                  className="flex items-center gap-2 py-2 px-3 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-all duration-200 rounded-lg"
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
                                  className="flex items-center gap-2 py-2 px-3 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all duration-200 rounded-lg text-red-600"
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4 px-6">
          <div className="text-sm text-slate-600">
            Showing {paginatedData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1 || totalPages === 0}
              className="border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1 || totalPages === 0}
              className="border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600 px-4 font-medium">
              Page {totalPages === 0 ? 0 : currentPage} of {totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages || totalPages === 0}
              className="border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage === totalPages || totalPages === 0}
              className="border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </Card>
  );
}