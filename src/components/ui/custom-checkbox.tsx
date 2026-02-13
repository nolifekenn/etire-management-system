"use client";

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  className,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked 
          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent" 
          : "bg-white hover:bg-slate-50",
        "transition-all duration-200 flex items-center justify-center",
        className
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  );
};