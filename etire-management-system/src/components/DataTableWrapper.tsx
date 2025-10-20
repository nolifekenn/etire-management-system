
"use client";

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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataTableWrapperProps<T> {
  title: string;
  columns: { key: string; header: string }[];
  data: (T & { id: string | number })[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderCell?: (item: T, columnKey: string, value: any) => React.ReactNode;
  onAddNew?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

// The component now expects data items to have a generic `id` property for keys.
// The pages are responsible for mapping their specific ID (e.g., item_id, job_id) to `id`.
export function DataTableWrapper<T>({
  title,
  columns,
  data,
  renderCell,
  onAddNew,
  onEdit,
  onDelete,
}: DataTableWrapperProps<T>) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {onAddNew && (
          <Button onClick={onAddNew} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={String(col.key)}>{col.header}</TableHead>
                ))}
                {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((col) => (
                      <TableCell key={String(col.key)}>
                        {renderCell
                          ? renderCell(item, col.key, (item as any)[col.key])
                          : String((item as any)[col.key])}
                      </TableCell>
                    ))}
                    {(onEdit || onDelete) && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEdit && <DropdownMenuItem onClick={() => onEdit(item)}>Edit</DropdownMenuItem>}
                            {onDelete && <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive">Delete</DropdownMenuItem>}
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
      </CardContent>
    </Card>
  );
}
