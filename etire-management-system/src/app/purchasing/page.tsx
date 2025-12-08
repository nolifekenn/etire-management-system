"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, PlusCircle, AlertTriangle, Package, Truck, ShoppingCart, Users, Building2,
  RefreshCw, Search, X, Download, Eye, ArrowUpDown, Filter, Clock, TrendingUp,
  Calendar, Phone, Mail, MapPin, FileText, CheckCircle, Clock4, TruckIcon, ArrowLeft,
  CreditCard, DollarSign, Shield, AlertCircle, Edit, Trash2, Save,
  History, CalendarDays, FileSearch, CreditCard as CreditCardIcon, List, ChevronLeft, ChevronRight
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Supplier, PurchaseOrder, Branch, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// ===== SUCCESS ANIMATION COMPONENT =====
const SuccessAnimation = ({
  isVisible,
  title,
  message,
  actionType,
  onConfirm
}: {
  isVisible: boolean;
  title: string;
  message: string;
  actionType?: 'add' | 'edit' | 'delete' | 'export' | 'create' | 'payment' | 'save' | 'credit';
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'add':
        return {
          gradient: 'from-green-500 to-emerald-600',
          icon: PlusCircle
        };
      case 'edit':
        return {
          gradient: 'from-blue-500 to-cyan-600',
          icon: Edit
        };
      case 'delete':
        return {
          gradient: 'from-red-500 to-orange-600',
          icon: Trash2
        };
      case 'export':
        return {
          gradient: 'from-purple-500 to-indigo-600',
          icon: Download
        };
      case 'create':
        return {
          gradient: 'from-teal-500 to-green-600',
          icon: FileText
        };
      case 'payment':
        return {
          gradient: 'from-amber-500 to-yellow-600',
          icon: DollarSign
        };
      case 'save':
        return {
          gradient: 'from-blue-500 to-cyan-600',
          icon: Save
        };
      case 'credit':
        return {
          gradient: 'from-purple-500 to-indigo-600',
          icon: CreditCard
        };
      default:
        return {
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckCircle
        };
    }
  };

  const { gradient, icon: ActionIcon } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <ActionIcon className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          {title}
        </h3>

        <p className="text-slate-600 mb-6 font-poppins">
          {message}
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            className={`bg-gradient-to-r ${gradient} hover:scale-105 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins`}
            onClick={onConfirm}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===== ENHANCED DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins",
  back: "flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

// ===== NOTES DIALOG COMPONENT =====
const NotesDialog = ({
  isOpen,
  onClose,
  notes
}: {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl mt-10 font-poppins">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900 font-poppins flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Order Notes
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-poppins">
            Full notes for this purchase order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <Label className="text-slate-700 font-medium font-poppins mb-2 block">
              Notes Content
            </Label>
            <div className="text-slate-800 whitespace-pre-wrap font-poppins min-h-[200px] p-3 bg-white border border-slate-300 rounded-lg">
              {notes || 'No notes available for this order.'}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== ENHANCED STATUS COMPONENTS =====

// Simple Delivery Status Badge with smaller font
const SimpleDeliveryStatus = ({ status }: { status: string }) => {
  const statusConfig = {
    ordered: {
      label: 'Ordered',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Package
    },
    delivered: {
      label: 'Delivered',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: Truck
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: X
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ordered;
  const IconComponent = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1 w-fit text-xs`}>
      <IconComponent className="h-3 w-3" />
      <span className="capitalize">{config.label}</span>
    </Badge>
  );
};

// Enhanced Payment Status with Credit Terms
const SimplePaymentStatus = ({ status, method, orderDate }: { status: string; method: string; orderDate?: string }) => {
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    paid: {
      label: 'Paid',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    partial: {
      label: 'Partial',
      color: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    overdue: {
      label: 'Overdue',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };

  const methodIcons = {
    cash: '💵',
    credit: '📅'
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const methodIcon = methodIcons[method as keyof typeof methodIcons] || '💵';

  // Calculate due date for credit (120 days from order date) and overdue status
  const getDueDateInfo = () => {
    if (method !== 'credit' || !orderDate) return null;

    const order = new Date(orderDate);
    const dueDate = new Date(order);
    dueDate.setDate(order.getDate() + 120);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Only mark as overdue if more than 120 days have passed AND payment is not paid
    const isOverdue = daysUntilDue < 0 && status !== 'paid';

    return { dueDate, daysUntilDue, isOverdue };
  };

  const dueInfo = getDueDateInfo();

  // Use overdue status if calculated
  const displayStatus = dueInfo?.isOverdue ? 'overdue' : status;

  const displayConfig = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className={`${displayConfig.color} flex items-center gap-1 w-fit text-xs`}>
        <span>{methodIcon}</span>
        <span className="capitalize">{displayConfig.label}</span>
      </Badge>
      {dueInfo && (
        <div className={`text-xs ${dueInfo.isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
          {dueInfo.isOverdue ? `Overdue ${Math.abs(dueInfo.daysUntilDue)} days` : `Due in ${dueInfo.daysUntilDue} days`}
        </div>
      )}
    </div>
  );
};

// Step by Step Process Component (Only Ordered and Delivered) - CLICKABLE VERSION
const DeliveryStepper = ({ currentStatus, onStatusChange }: { currentStatus: string; onStatusChange: (status: string) => void }) => {
  const steps = [
    { key: 'ordered', label: 'Ordered', icon: Package },
    { key: 'delivered', label: 'Delivered', icon: Truck }
  ];

  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  const handleStepClick = (stepKey: string, stepIndex: number) => {
    // Allow clicking on any step to change status
    onStatusChange(stepKey);
  };

  return (
    <div className="space-y-4">
      <Label className="text-slate-700 font-medium font-poppins">
        Delivery Progress
      </Label>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={`flex-1 h-1 ${index <= currentIndex ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                  />
                )}

                {/* Step circle - NOW CLICKABLE */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.key, index)}
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${isCompleted
                    ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600 cursor-pointer'
                    : isCurrent
                      ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 cursor-pointer'
                      : 'bg-white border-slate-300 text-slate-400 hover:bg-slate-100 hover:border-slate-400 cursor-pointer'
                    } transform hover:scale-110 active:scale-95`}
                >
                  <IconComponent className="h-4 w-4" />

                  {/* Show checkmark for completed steps */}
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 ${index < currentIndex ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                  />
                )}
              </div>

              {/* Step label - ALSO CLICKABLE */}
              <button
                type="button"
                onClick={() => handleStepClick(step.key, index)}
                className={`mt-2 text-center transition-all duration-200 ${isCompleted || isCurrent
                  ? 'text-slate-800 font-medium hover:text-slate-900 cursor-pointer'
                  : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                  }`}
              >
                <div className="text-xs font-medium">
                  {step.label}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Current Status Display */}
      <div className="text-center mt-2">
        <Badge
          variant="outline"
          className={`${currentStatus === 'delivered'
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-blue-100 text-blue-800 border-blue-200'
            } text-sm font-medium`}
        >
          Current Status: {currentStatus === 'delivered' ? 'Delivered' : 'Ordered'}
        </Badge>
      </div>
    </div>
  );
};

// Credit Table Component
const CreditTableDialog = ({
  isOpen,
  onClose,
  purchaseOrders
}: {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders: any[];
}) => {
  const creditOrders = useMemo(() => {
    return purchaseOrders.filter(po =>
      po.payment_method === 'credit' &&
      (po.payment_status === 'partial' || po.payment_status === 'pending' || po.payment_status === 'overdue')
    );
  }, [purchaseOrders]);

  const calculateDueDate = (orderDate: string) => {
    const order = new Date(orderDate);
    const dueDate = new Date(order);
    dueDate.setDate(order.getDate() + 120);
    return dueDate;
  };

  const isOverdue = (orderDate: string) => {
    const dueDate = calculateDueDate(orderDate);
    const today = new Date();
    return dueDate < today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white border-0 shadow-2xl mt-10 font-poppins max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900 font-poppins flex items-center gap-2">
            <CreditCardIcon className="h-6 w-6" />
            Credit Management
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-poppins">
            Manage credit purchases and track payment schedules
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {creditOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No Credit Purchases</p>
              <p className="text-sm mt-1">All credit purchases are fully paid</p>
            </div>
          ) : (
            <div className="space-y-4">
              {creditOrders.map(po => {
                const dueDate = calculateDueDate(po.order_date);
                const overdue = isOverdue(po.order_date);

                return (
                  <div key={po.po_id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="font-semibold text-purple-700">{po.po_number}</div>
                        <div className="text-sm text-slate-600">{po.supplier?.name}</div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-800">
                          ₱{Number(po.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-slate-600">
                          {po.payment_status === 'partial' ? 'Partial Payment' : 'Pending Payment'}
                        </div>
                      </div>

                      <div>
                        <div className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                          Due: {dueDate.toLocaleDateString('en-US')}
                        </div>
                        <div className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                          {overdue ? `${Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue` : 'On track'}
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={overdue ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}
                        >
                          {overdue ? 'Overdue' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Payment Recording Component for Credit Management
const PaymentRecording = ({
  po,
  onPaymentRecorded
}: {
  po: any;
  onPaymentRecorded: () => void;
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const remainingBalance = Number(po.total_amount || 0) - Number(po.paid_amount || 0);

  const handleRecordPayment = async () => {
    if (!supabase) return;

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    if (Number(paymentAmount) > remainingBalance) {
      toast({
        title: "Amount Exceeds Balance",
        description: `Payment amount cannot exceed remaining balance of ₱${remainingBalance.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate new paid amount and payment status
      const newPaidAmount = Number(po.paid_amount || 0) + Number(paymentAmount);
      const newPaymentStatus = newPaidAmount >= Number(po.total_amount) ? 'paid' : 'partial';

      // Update the purchase order in database
      const { error } = await supabase
        .from('purchase_order')
        // @ts-ignore
        .update({
          paid_amount: newPaidAmount,
          payment_status: newPaymentStatus,
          last_payment_date: paymentDate
        } as any)
        .eq('po_id', po.po_id);

      if (error) throw error;

      // Record payment transaction
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        // @ts-ignore
        .insert({
          po_id: po.po_id,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: 'credit_payment',
          recorded_at: new Date().toISOString()
        } as any);

      if (paymentError) throw paymentError;

      toast({
        title: "Payment Recorded",
        description: `Payment of ₱${Number(paymentAmount).toLocaleString()} recorded successfully`,
      });

      setPaymentAmount('');
      onPaymentRecorded();
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
      <Label className="text-slate-700 font-medium font-poppins flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4" />
        Record Payment
      </Label>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <Label className="text-slate-600 text-sm">Total Amount</Label>
          <div className="font-bold text-slate-800">
            ₱{Number(po.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <Label className="text-slate-600 text-sm">Paid Amount</Label>
          <div className="font-bold text-green-600">
            ₱{Number(po.paid_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <Label className="text-slate-600 text-sm">Remaining Balance</Label>
          <div className={`font-bold ${remainingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            ₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="payment-amount" className="text-slate-700 font-poppins text-sm">
            Payment Amount
          </Label>
          <Input
            id="payment-amount"
            type="number"
            placeholder="0.00"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="border-slate-300 focus:border-purple-500 bg-white text-sm"
            min="0"
            max={remainingBalance}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-date" className="text-slate-700 font-poppins text-sm">
            Payment Date
          </Label>
          <Input
            id="payment-date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="border-slate-300 focus:border-purple-500 bg-white text-sm"
          />
        </div>
      </div>

      <Button
        onClick={handleRecordPayment}
        disabled={isProcessing || !paymentAmount || Number(paymentAmount) <= 0}
        className="mt-3 w-full"
        size="sm"
      >
        {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Record Payment
      </Button>

      {remainingBalance === 0 && (
        <Alert className="bg-green-50 border-green-200 mt-3">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Fully Paid</AlertTitle>
          <AlertDescription className="text-green-700">
            This purchase order has been fully paid.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// ===== PO LINE ITEMS COMPONENT =====
interface POLineItem {
  id: string;
  item_id: string | null;  // null for custom items
  customName: string;      // Used when item_id is null
  quantity: number;
  unit_cost: number;
}

const POLineItems = ({
  items,
  onItemsChange,
  inventory
}: {
  items: POLineItem[];
  onItemsChange: (items: POLineItem[]) => void;
  inventory: any[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const addItem = () => {
    onItemsChange([
      ...items,
      {
        id: `temp-${Date.now()}`,
        item_id: null,
        customName: '',
        quantity: 1,
        unit_cost: 0
      }
    ]);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof POLineItem, value: any) => {
    onItemsChange(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const selectInventoryItem = (lineId: string, inventoryItem: any) => {
    onItemsChange(items.map(item =>
      item.id === lineId
        ? {
          ...item,
          item_id: inventoryItem.item_id,
          customName: inventoryItem.name,
          unit_cost: inventoryItem.cost_price || 0
        }
        : item
    ));
    setShowDropdown(null);
    setSearchTerm('');
  };

  // Sort inventory alphabetically and filter by search term
  const filteredInventory = inventory
    .filter(inv => inv.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lineTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  return (
    <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <Label className="text-slate-700 font-medium font-poppins text-base">
          📦 Order Items
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No items added yet</p>
          <p className="text-xs">Click "Add Item" to add items to this order</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-lg border border-slate-200">
              {/* Item Selection/Name - col-span-5 */}
              <div className="col-span-5 relative">
                <Label className="text-xs text-slate-500 mb-1 block">Item</Label>
                <div className="relative">
                  <Input
                    placeholder="Search or type item name..."
                    value={item.customName}
                    onChange={(e) => {
                      updateItem(item.id, 'customName', e.target.value);
                      updateItem(item.id, 'item_id', null); // Clear item_id when typing custom
                      setSearchTerm(e.target.value);
                      setShowDropdown(item.id);
                    }}
                    onFocus={() => {
                      setShowDropdown(item.id);
                      setSearchTerm(item.customName);
                    }}
                    className="h-9 text-sm"
                  />
                  {showDropdown === item.id && filteredInventory.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredInventory.slice(0, 15).map(inv => (
                        <button
                          key={inv.item_id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 text-sm flex justify-between items-center"
                          onClick={() => selectInventoryItem(item.id, inv)}
                        >
                          <span>{inv.name}</span>
                          <span className="text-slate-400 text-xs">₱{inv.cost_price?.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {item.item_id && (
                  <span className="text-xs text-green-600 mt-0.5 block">✓ From inventory</span>
                )}
              </div>

              {/* Quantity - col-span-2 */}
              <div className="col-span-2">
                <Label className="text-xs text-slate-500 mb-1 block">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  className="h-9 text-sm text-center"
                />
              </div>

              {/* Unit Cost - col-span-2 */}
              <div className="col-span-2">
                <Label className="text-xs text-slate-500 mb-1 block">Unit Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Line Total - col-span-2 */}
              <div className="col-span-2">
                <Label className="text-xs text-slate-500 mb-1 block">Total</Label>
                <div className="h-9 flex items-center px-2 bg-slate-100 rounded-md text-sm font-medium">
                  ₱{(item.quantity * item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Remove Button - col-span-1 */}
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grand Total */}
      {items.length > 0 && (
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg">
            <span className="text-sm opacity-90">Order Total: </span>
            <span className="text-lg font-bold">
              ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Purchase Order Form with Credit Logic
const EnhancedPOForm = ({
  editingPO,
  formData,
  onFormChange,
  suppliers,
  branches,
  isEditing,
  onPaymentRecorded
}: {
  editingPO: any;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  suppliers: any[];
  branches: any[];
  isEditing: boolean;
  onPaymentRecorded: () => void;
}) => {
  // Calculate due date for credit terms
  const calculateDueDate = useCallback(() => {
    if (formData.paymentMethod === 'credit' && formData.expectedDelivery) {
      const deliveryDate = new Date(formData.expectedDelivery);
      const dueDate = new Date(deliveryDate);
      dueDate.setDate(deliveryDate.getDate() + 120);
      return dueDate.toLocaleDateString('en-US');
    }
    return null;
  }, [formData.paymentMethod, formData.expectedDelivery]);

  const dueDate = calculateDueDate();

  // Auto-cancel handler - UPDATED FOR CLICKABLE DELIVERY
  const handleStatusChange = (field: 'deliveryStatus' | 'paymentStatus', value: string) => {
    onFormChange(field, value);

    // Auto-cancel the other status when one is cancelled
    if (value === 'cancelled') {
      if (field === 'deliveryStatus') {
        onFormChange('paymentStatus', 'cancelled');
      } else if (field === 'paymentStatus') {
        onFormChange('deliveryStatus', 'cancelled');
      }
    }

    // Auto-set payment status to paid when delivered and payment method is cash
    if (field === 'deliveryStatus' && value === 'delivered' && formData.paymentMethod === 'cash') {
      onFormChange('paymentStatus', 'paid');
    }

    // Show success toast when delivery status changes
    if (field === 'deliveryStatus') {
      console.log(`Delivery status changed to: ${value}`);
    }
  };

  // Payment method change handler
  const handlePaymentMethodChange = (value: 'cash' | 'credit') => {
    onFormChange('paymentMethod', value);

    // Auto-set payment status based on method
    if (value === 'credit') {
      onFormChange('paymentStatus', 'pending');
    } else if (value === 'cash') {
      onFormChange('paymentStatus', 'pending');
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="po-number" className="text-slate-700 font-medium font-poppins">
              PO Number *
            </Label>
            <div className="relative">
              <Input
                id="po-number"
                value={formData.poNumber}
                onChange={(e) => onFormChange('poNumber', e.target.value)}
                placeholder="PO-0001"
                readOnly={isEditing}
                className={`border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 ${isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                  } font-poppins`}
              />
              {!isEditing && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs font-poppins bg-green-100 text-green-700 border-green-200">
                    Auto
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier" className="text-slate-700 font-medium font-poppins">
              Supplier *
            </Label>
            <Select
              value={formData.selectedSupplier}
              onValueChange={(value) => onFormChange('selectedSupplier', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={`border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 ${isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                } font-poppins`}>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.filter(s => s.is_active).map(supplier => (
                  <SelectItem key={supplier.supplier_id} value={supplier.supplier_id} className="font-poppins">
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-delivery" className="text-slate-700 font-medium font-poppins">
              Expected Delivery
            </Label>
            <Input
              id="expected-delivery"
              type="date"
              value={formData.expectedDelivery}
              onChange={(e) => onFormChange('expectedDelivery', e.target.value)}
              min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
              className="border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white font-poppins"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="branch" className="text-slate-700 font-medium font-poppins">
              Branch *
            </Label>
            <Select
              value={formData.selectedBranch}
              onValueChange={(value) => onFormChange('selectedBranch', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={`border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 ${isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                } font-poppins`}>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id} className="font-poppins">
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium font-poppins">Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={handlePaymentMethodChange}
              disabled={isEditing}
            >
              <SelectTrigger className={`border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 ${isEditing ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'
                } font-poppins`}>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash" className="font-poppins">💵 Cash</SelectItem>
                <SelectItem value="credit" className="font-poppins">📅 Credit (120 days)</SelectItem>
              </SelectContent>
            </Select>
            {formData.paymentMethod === 'credit' && dueDate && (
              <p className="text-xs text-slate-500">
                Payment due: {dueDate}
              </p>
            )}
          </div>

          {/* Delivery Status - Only in Edit Mode */}
          {isEditing && (
            <div className="space-y-2">
              <DeliveryStepper
                currentStatus={formData.deliveryStatus}
                onStatusChange={(value) => handleStatusChange('deliveryStatus', value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Payment Status */}
      {isEditing && (
        <div className="space-y-2">
          <Label className="text-slate-700 font-medium font-poppins">Payment Status</Label>
          <Select
            value={formData.paymentStatus}
            onValueChange={(value) => handleStatusChange('paymentStatus', value)}
            disabled={formData.paymentMethod === 'cash' && formData.deliveryStatus === 'delivered'}
          >
            <SelectTrigger className="border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" className="font-poppins">⏳ Pending</SelectItem>
              <SelectItem value="paid" className="font-poppins">✅ Paid</SelectItem>
              <SelectItem value="overdue" className="font-poppins">🔴 Overdue</SelectItem>
              <SelectItem value="cancelled" className="font-poppins">❌ Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {formData.paymentMethod === 'cash' && formData.deliveryStatus === 'delivered' && (
            <p className="text-xs text-green-600">
              Payment status automatically set to Paid when delivered for cash payments
            </p>
          )}
        </div>
      )}

      {/* Payment Recording for Credit Orders */}
      {isEditing && formData.paymentMethod === 'credit' && formData.paymentStatus !== 'paid' && formData.paymentStatus !== 'cancelled' && (
        <PaymentRecording
          po={editingPO}
          onPaymentRecorded={onPaymentRecorded}
        />
      )}

      {/* Cancellation Reason */}
      {(formData.deliveryStatus === 'cancelled' || formData.paymentStatus === 'cancelled') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <Label htmlFor="cancellation-reason" className="text-red-800 font-medium font-poppins">
            Cancellation Reason *
          </Label>
          <Textarea
            id="cancellation-reason"
            value={formData.cancellationReason || ''}
            onChange={(e) => onFormChange('cancellationReason', e.target.value)}
            placeholder="Please provide the reason for cancellation..."
            className="border-red-300 focus:border-red-500 bg-white mt-2 text-sm"
            rows={3}
          />
        </div>
      )}

      {(formData.deliveryStatus === 'cancelled' || formData.paymentStatus === 'cancelled') && (
        <Alert className="bg-red-50 border-red-200 font-poppins">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Order Cancellation</AlertTitle>
          <AlertDescription className="text-red-700">
            Both delivery and payment statuses will be set to cancelled.
          </AlertDescription>
        </Alert>
      )}

      {/* Notes Section */}
      <div className="space-y-2">
        <Label htmlFor="po-notes" className="text-slate-700 font-medium font-poppins">
          Notes & Instructions
        </Label>
        <Textarea
          id="po-notes"
          value={formData.poNotes}
          onChange={(e) => onFormChange('poNotes', e.target.value)}
          placeholder="Additional notes, special instructions, or delivery requirements..."
          className="border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white font-poppins min-h-[80px] text-sm"
        />
      </div>

      {/* Form Validation */}
      {(!formData.selectedSupplier || !formData.selectedBranch) && (
        <Alert className="bg-amber-50 border-amber-200 font-poppins">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Required Fields</AlertTitle>
          <AlertDescription className="text-amber-700">
            Please fill in all required fields marked with *
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};


// Enhanced Table Row with Clickable Rows
const EnhancedTableRow = ({
  item,
  onEdit,
  onDelete,
  onRowClick
}: {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onRowClick: (item: any) => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="grid grid-cols-9 gap-3 px-6 py-2 items-center border-b border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onRowClick(item)}
    >
      {/* PO Number */}
      <div className="font-semibold text-purple-700 text-sm">
        {item.po_number}
      </div>

      {/* Supplier */}
      <div className="flex items-center gap-2">
        <Building2 className="h-3 w-3 text-slate-500" />
        <span className="font-medium text-sm truncate">{item.supplier?.name || 'Unknown'}</span>
      </div>

      {/* Branch */}
      <div className="flex items-center gap-2">
        <MapPin className="h-3 w-3 text-slate-500" />
        <span className="text-sm truncate">{item.branch?.name || 'Unknown'}</span>
      </div>

      {/* Order Date */}
      <div className="text-slate-700 text-sm">
        {item.order_date ? new Date(item.order_date).toLocaleDateString('en-US') : 'No date'}
      </div>

      {/* Expected Delivery */}
      <div>
        <span className={`font-medium text-sm ${item.expected_delivery_date && new Date(item.expected_delivery_date) < new Date() && item.status !== 'delivered'
          ? 'text-red-600'
          : 'text-slate-700'
          }`}>
          {item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString('en-US') : 'Not set'}
        </span>
      </div>

      {/* Total Amount */}
      <div className="font-bold text-slate-800 text-sm">
        ₱{Number(item.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* Delivery Status - Updated for better visual feedback */}
      <div>
        <div
          className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(item);
          }}
        >
          <SimpleDeliveryStatus status={item.status || 'ordered'} />
        </div>
      </div>

      {/* Payment Status */}
      <div>
        <SimplePaymentStatus
          status={item.payment_status || 'pending'}
          method={item.payment_method || 'cash'}
          orderDate={item.order_date}
        />
      </div>

      {/* Actions Column */}
      <div className="flex justify-center">
        <div className={`flex items-center gap-1 transition-opacity duration-200'
          }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors border border-transparent"
            title="Edit"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Filter Component for Purchase Orders with Order Date Filter
const POFilter = ({
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchChange,
  selectedBranch,
  onBranchChange,
  branches,
  showBranchFilter = true,
  orderDateFrom,
  orderDateTo,
  onOrderDateFromChange,
  onOrderDateToChange,
  rowsPerPage,
  onRowsPerPageChange
}: {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
  branches?: any[];
  showBranchFilter?: boolean;
  orderDateFrom?: string;
  orderDateTo?: string;
  onOrderDateFromChange?: (date: string) => void;
  onOrderDateToChange?: (date: string) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (size: number) => void;
}) => {
  return (
    <div className="bg-white p-5 border-b border-slate-200">
      {/* Single Row with all filters */}
      <div className="flex flex-col xl:flex-row gap-3 items-end">
        {/* Search - takes more space */}
        <div className="flex-1 w-full min-w-[200px]">
          <Label htmlFor="search-pos" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
            Search Purchase Orders
          </Label>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              id="search-pos"
              placeholder="Search by PO number, supplier, or branch..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 transition-all rounded-md text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full xl:w-[140px]">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ordered">📦 Ordered</SelectItem>
              <SelectItem value="delivered">🚚 Delivered</SelectItem>
              <SelectItem value="cancelled">❌ Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Branch Filter */}
        {showBranchFilter && (
          <div className="w-full xl:w-[140px]">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Branch</Label>
            <Select value={selectedBranch || 'all'} onValueChange={onBranchChange}>
              <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md text-sm">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.map(branch => (
                  <SelectItem key={branch.branch_id} value={branch.branch_id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date From */}
        <div className="w-full xl:w-[150px]">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">From</Label>
          <Input
            type="date"
            value={orderDateFrom || ''}
            onChange={(e) => onOrderDateFromChange?.(e.target.value)}
            className="h-10 bg-white border-slate-200 rounded-md text-sm"
          />
        </div>

        {/* Date To */}
        <div className="w-full xl:w-[150px]">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">To</Label>
          <Input
            type="date"
            value={orderDateTo || ''}
            onChange={(e) => onOrderDateToChange?.(e.target.value)}
            className="h-10 bg-white border-slate-200 rounded-md text-sm"
          />
        </div>

        {/* Rows Per Page */}
        <div className="w-full xl:w-20">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Rows</Label>
          <Select
            value={String(rowsPerPage || 25)}
            onValueChange={(v) => onRowsPerPageChange?.(Number(v))}
          >
            <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Dates Button */}
        {(orderDateFrom || orderDateTo) && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOrderDateFromChange?.('');
                onOrderDateToChange?.('');
              }}
              className="h-10 px-3 text-slate-500 border-slate-200 hover:bg-slate-50"
              title="Clear Dates"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Pagination Component
const EnhancedPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  displayedCount
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
  displayedCount: number;
}) => {
  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left: Showing X to Y of Z entries */}
      <div className="text-sm text-slate-500">
        Showing <span className="font-medium">{totalItems === 0 ? 0 : ((currentPage - 1) * pageSize + 1)}</span> to{' '}
        <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
        <span className="font-medium">{totalItems}</span> entries
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* First Page Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
          title="First Page"
        >
          <span className="text-lg">«</span>
        </Button>

        {/* Previous Page Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
          title="Previous Page"
        >
          <span className="text-lg">‹</span>
        </Button>

        {/* Page Indicator */}
        <div className="text-sm font-medium text-slate-500 px-2 min-w-[100px] text-center select-none">
          Page {currentPage} of {totalPages || 1}
        </div>

        {/* Next Page Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
          title="Next Page"
        >
          <span className="text-lg">›</span>
        </Button>

        {/* Last Page Button */}
        <Button
          variant="outline"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-9 w-9 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md"
          title="Last Page"
        >
          <span className="text-lg">»</span>
        </Button>
      </div>
    </div>
  );
};

// Modern Widget Components
const StatsOverview = ({ suppliers, purchaseOrders }: { suppliers: any[], purchaseOrders: any[] }) => {
  const activeSuppliers = suppliers.filter(s => s.is_active).length;
  const orderedPOs = purchaseOrders.filter(po => po.status === 'ordered').length;
  const deliveredThisMonth = purchaseOrders.filter(po =>
    po.status === 'delivered' &&
    new Date(po.order_date).getMonth() === new Date().getMonth()
  ).length;
  const totalPOValue = purchaseOrders.reduce((acc, po) => acc + (po.total_amount || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className={`bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Active Suppliers</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{activeSuppliers}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Building2 className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
          <TrendingUp className="h-4 w-4" />
          <span>All active partners</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium font-poppins">Ordered POs</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{orderedPOs}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-blue-100 text-sm font-poppins">
          <AlertTriangle className="h-4 w-4" />
          <span>Awaiting delivery</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-teal-400 via-cyan-500 to-green-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-teal-100 text-sm font-medium font-poppins">Delivered This Month</p>
            <p className="text-3xl font-bold mt-2 font-poppins">{deliveredThisMonth}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <TruckIcon className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-teal-100 text-sm font-poppins">
          <CheckCircle className="h-4 w-4" />
          <span>Successful deliveries</span>
        </div>
      </div>

      <div className={`bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium font-poppins">Total PO Value</p>
            <p className="text-3xl font-bold mt-2 font-poppins">₱{totalPOValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
          <TrendingUp className="h-4 w-4" />
          <span>This year</span>
        </div>
      </div>
    </div>
  );
};

// Quick Actions with Credit Management Button
const EnhancedQuickActions = ({
  onAddSupplier,
  onAddPO,
  onExportData,
  onViewCreditTable
}: {
  onAddSupplier: () => void;
  onAddPO: () => void;
  onExportData: () => void;
  onViewCreditTable: () => void;
}) => {
  const actions = [
    {
      label: "New Supplier",
      description: "Add a new supplier",
      icon: Building2,
      onClick: onAddSupplier,
      color: "from-purple-500 to-indigo-600"
    },
    {
      label: "Create PO",
      description: "Create purchase order",
      icon: FileText,
      onClick: onAddPO,
      color: "from-blue-500 to-sky-600"
    },
    {
      label: "Export Data",
      description: "Export to Excel",
      icon: Download,
      onClick: onExportData,
      color: "from-green-500 to-emerald-600"
    },
    {
      label: "Credit Management",
      description: "View credit table",
      icon: CreditCardIcon,
      onClick: onViewCreditTable,
      color: "from-red-500 to-pink-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group font-poppins`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{action.label}</p>
              <p className="text-white/80 text-sm mt-1">{action.description}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <action.icon className="h-5 w-5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// Enhanced Tabs
const EnhancedTabs = ({ value, onValueChange, children }: any) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full font-poppins">
      <TabsList className="grid w-full grid-cols-4 p-1 bg-slate-100 rounded-2xl">
        <TabsTrigger
          value="suppliers"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins text-sm"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Suppliers
        </TabsTrigger>
        <TabsTrigger
          value="purchase-orders"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins text-sm"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Orders
        </TabsTrigger>
        <TabsTrigger
          value="transaction-history"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins text-sm"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </TabsTrigger>
        <TabsTrigger
          value="credit-management"
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins text-sm"
        >
          <CreditCardIcon className="h-4 w-4 mr-2" />
          Credit
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

// Supplier Management
const supplierColumns = [
  { key: 'name', header: 'Supplier Name' },
  { key: 'contact_person', header: 'Contact Person' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  {
    key: 'is_active',
    header: 'Status',
    render: (value: any) => (
      <Badge
        variant={value ? 'default' : 'secondary'}
        className={`${value ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} font-poppins`}
      >
        {value ? 'Active' : 'Inactive'}
      </Badge>
    )
  }
];

// MAIN COMPONENT
export default function EnhancedPurchasingPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('purchase-orders');
  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Success Animation State
  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    actionType: 'add' | 'edit' | 'delete' | 'export' | 'create' | 'payment' | 'save' | 'credit';
  }>({
    isVisible: false,
    title: '',
    message: '',
    actionType: 'add'
  });

  // Notes Dialog State
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string>('');

  // State management
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSupplierLoading, setIsSupplierLoading] = useState(true);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isPOLoading, setIsPOLoading] = useState(true);
  const [poError, setPOError] = useState<string | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Dialog states
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreditTableOpen, setIsCreditTableOpen] = useState(false);
  const [isInventoryConfirmOpen, setIsInventoryConfirmOpen] = useState(false);
  const [pendingDeliveryPO, setPendingDeliveryPO] = useState<PurchaseOrder | null>(null);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);

  // Search and Filter states
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [poSearchTerm, setPOSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Order Date Filter states
  const [orderDateFrom, setOrderDateFrom] = useState<string>('');
  const [orderDateTo, setOrderDateTo] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Pagination states for each tab
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(5);

  const [poPage, setPOPage] = useState(1);
  const [poPageSize, setPOPageSize] = useState(5);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);

  // Enhanced PO Form State - Default to 'ordered' status
  const [poFormData, setPOFormData] = useState({
    poNumber: '',
    selectedSupplier: '',
    selectedBranch: '',
    expectedDelivery: '',
    poNotes: '',
    paymentMethod: 'cash' as 'cash' | 'credit',
    paymentStatus: 'pending' as 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled',
    deliveryStatus: 'ordered' as 'ordered' | 'delivered' | 'cancelled',
    cancellationReason: ''
  });

  // PO Line Items state
  const [poLineItems, setPOLineItems] = useState<POLineItem[]>([]);

  // Supplier form state
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierActive, setSupplierActive] = useState(true);

  // Initialize
  useEffect(() => {
    setMounted(true);
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchSupportingData();
  }, []);

  // Data fetching functions
  const fetchSuppliers = useCallback(async () => {
    if (!supabase) return;
    setIsSupplierLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('get_suppliers_complete');

      if (error) {
        setSupplierError(`Could not fetch suppliers: ${error.message}`);
        setSuppliers([]);
      } else {
        setSuppliers((data || []) as Supplier[]);
        setSupplierError(null);
      }
    } catch (error: any) {
      setSupplierError('Network error');
      setSuppliers([]);
    }

    setIsSupplierLoading(false);
    setLastUpdated(new Date());
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!supabase) return;
    setIsPOLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('get_purchase_orders_complete');

      if (error) {
        setPOError(`Could not fetch purchase orders: ${error.message}`);
        setPurchaseOrders([]);
      } else {
        setPurchaseOrders((data || []) as any);
        setPOError(null);
      }
    } catch (error: any) {
      setPOError('Network error');
      setPurchaseOrders([]);
    }

    setIsPOLoading(false);
    setLastUpdated(new Date());
  }, []);

  const fetchNextPONumber = useCallback(async () => {
    if (!supabase) return '';
    try {
      const { data, error } = await supabase.rpc('generate_po_number');
      if (error) {
        console.error('Error generating PO number:', error);
        toast({
          title: 'Warning',
          description: 'Could not auto-generate PO number. Please enter manually.',
          variant: 'destructive'
        });
        return '';
      }
      return data as string;
    } catch (error: any) {
      console.error('Network error:', error);
      return '';
    }
  }, [toast]);

  const fetchSupportingData = useCallback(async () => {
    if (!supabase) return;
    const [branchesRes, inventoryRes, usersRes] = await Promise.all([
      supabase.from('branch').select('branch_id, name').eq('is_active', true),
      supabase.from('inventory_item').select('item_id, name, category, cost_price'),
      supabase.from('user').select('user_id, name').in('role', ['admin', 'manager'])
    ]);

    if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
    if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
    if (usersRes.data) setUsers(usersRes.data as User[]);
  }, []);

  // Filters
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
        supplier.address?.toLowerCase().includes(supplierSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [suppliers, supplierSearchTerm]);

  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = po.po_number.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        po.supplier?.name.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        po.branch?.name.toLowerCase().includes(poSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesBranch = branchFilter === 'all' || po.branch_id === branchFilter;

      // Order date filter
      let matchesDate = true;
      if (orderDateFrom || orderDateTo) {
        const poDate = po.order_date ? new Date(po.order_date) : null;
        if (poDate) {
          if (orderDateFrom) {
            const fromDate = new Date(orderDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && poDate >= fromDate;
          }
          if (orderDateTo) {
            const toDate = new Date(orderDateTo);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && poDate <= toDate;
          }
        }
      }

      // For purchase orders tab, only show active orders (not delivered or cancelled)
      const isActiveOrder = po.status !== 'delivered' && po.status !== 'cancelled';

      return matchesSearch && matchesStatus && matchesBranch && matchesDate &&
        (activeTab === 'purchase-orders' ? isActiveOrder : true);
    });
  }, [purchaseOrders, poSearchTerm, statusFilter, branchFilter, orderDateFrom, orderDateTo, activeTab]);

  // Transaction History (Delivered and Cancelled orders only) - sorted by PO number
  const transactionHistory = useMemo(() => {
    return purchaseOrders
      .filter(po => po.status === 'delivered' || po.status === 'cancelled')
      .sort((a, b) => {
        // Sort by PO number in descending order (most recent first)
        // Extract numeric part for proper sorting (e.g., PO-0021 > PO-0020)
        const numA = parseInt(a.po_number.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.po_number.replace(/\D/g, '')) || 0;
        return numB - numA;
      });
  }, [purchaseOrders]);

  // Credit Management (Credit orders with partial or pending payment)
  const creditOrders = useMemo(() => {
    return purchaseOrders.filter(po =>
      po.payment_method === 'credit' &&
      (po.payment_status === 'partial' || po.payment_status === 'pending' || po.payment_status === 'overdue')
    );
  }, [purchaseOrders]);

  // Paginated Suppliers
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (supplierPage - 1) * supplierPageSize;
    const endIndex = startIndex + supplierPageSize;
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, supplierPage, supplierPageSize]);

  const supplierTotalPages = Math.ceil(filteredSuppliers.length / supplierPageSize);

  // Paginated Transaction History
  const filteredHistory = useMemo(() => {
    return transactionHistory.filter(po => {
      const matchesSearch = po.po_number.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        po.supplier?.name.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
        po.branch?.name.toLowerCase().includes(poSearchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesBranch = branchFilter === 'all' || po.branch_id === branchFilter;

      let matchesDate = true;
      if (orderDateFrom || orderDateTo) {
        const poDate = po.order_date ? new Date(po.order_date) : null;
        if (poDate) {
          if (orderDateFrom) {
            const fromDate = new Date(orderDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && poDate >= fromDate;
          }
          if (orderDateTo) {
            const toDate = new Date(orderDateTo);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && poDate <= toDate;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesBranch && matchesDate;
    });
  }, [transactionHistory, poSearchTerm, statusFilter, branchFilter, orderDateFrom, orderDateTo]);

  const paginatedHistory = useMemo(() => {
    const startIndex = (historyPage - 1) * historyPageSize;
    const endIndex = startIndex + historyPageSize;
    return filteredHistory.slice(startIndex, endIndex);
  }, [filteredHistory, historyPage, historyPageSize]);

  const historyTotalPages = Math.ceil(filteredHistory.length / historyPageSize);

  // Paginated data
  const paginatedPurchaseOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPurchaseOrders.slice(startIndex, endIndex);
  }, [filteredPurchaseOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPurchaseOrders.length / pageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setSupplierPage(1);
  }, [supplierSearchTerm, filteredSuppliers.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [poSearchTerm, statusFilter, branchFilter, orderDateFrom, orderDateTo]);
  
  useEffect(() => {
    setHistoryPage(1);
  }, [poSearchTerm, statusFilter, branchFilter, orderDateFrom, orderDateTo]);

  const handleRefresh = () => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchSupportingData();
  };

  // Define handlers before they are used
  const handleEditPO = useCallback(async (po: PurchaseOrder) => {
    setEditingPO(po);
    setPOFormData({
      poNumber: po.po_number,
      selectedSupplier: po.supplier_id,
      selectedBranch: po.branch_id,
      expectedDelivery: po.expected_delivery_date || '',
      poNotes: po.notes || '',
      paymentMethod: (po as any).payment_method || 'cash',
      paymentStatus: (po as any).payment_status || 'pending',
      deliveryStatus: ((po.status === 'pending' || po.status === 'approved') ? 'ordered' : po.status) as 'ordered' | 'delivered' | 'cancelled',
      cancellationReason: (po as any).cancellation_reason || ''
    });

    // Fetch existing line items for this PO
    if (supabase) {
      const { data: existingItems, error } = await supabase
        .from('purchase_order_item')
        .select('po_item_id, item_id, quantity, unit_cost')
        .eq('po_id', po.po_id);

      if (!error && existingItems && existingItems.length > 0) {
        // Map to POLineItem format with item names
        const lineItems: POLineItem[] = await Promise.all(
          (existingItems as any[]).map(async (item) => {
            let itemName = '';
            if (item.item_id) {
              // Get item name from inventory
              const inventoryItem = inventory.find(inv => inv.item_id === item.item_id);
              itemName = inventoryItem?.name || 'Unknown Item';
            }
            return {
              id: item.po_item_id,
              item_id: item.item_id,
              customName: itemName,
              quantity: item.quantity,
              unit_cost: item.unit_cost
            };
          })
        );
        setPOLineItems(lineItems);
      } else {
        setPOLineItems([]);
      }
    }

    setIsPODialogOpen(true);
  }, [inventory]);

  const handleDeletePO = useCallback((po: PurchaseOrder) => {
    setDeletingItem({ ...po, type: 'po' });
    setIsDeleteDialogOpen(true);
  }, []);

  const handleRowClick = useCallback((po: PurchaseOrder) => {
    handleEditPO(po);
  }, [handleEditPO]);

  // Handle notes icon click in transaction history
  const handleNotesClick = useCallback((notes: string) => {
    setSelectedNotes(notes);
    setIsNotesDialogOpen(true);
  }, []);

  // Enhanced PO Form Handlers
  const handlePOFormChange = (field: string, value: any) => {
    setPOFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetPOForm = () => {
    setPOFormData({
      poNumber: '',
      selectedSupplier: '',
      selectedBranch: '',
      expectedDelivery: '',
      poNotes: '',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      deliveryStatus: 'ordered',
      cancellationReason: ''
    });
    setPOLineItems([]);
    setEditingPO(null);
  };

  const resetSupplierForm = () => {
    setSupplierName('');
    setContactPerson('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setSupplierActive(true);
    setEditingSupplier(null);
  };

  const handleOpenSupplierDialog = () => {
    resetSupplierForm();
    setIsSupplierDialogOpen(true);
  };

  const handleOpenPODialog = async () => {
    resetPOForm();
    const nextPO = await fetchNextPONumber();
    if (nextPO) {
      handlePOFormChange('poNumber', nextPO);
    }
    setIsPODialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierName(supplier.name);
    setContactPerson(supplier.contact_person || '');
    setSupplierPhone(supplier.phone || '');
    setSupplierEmail(supplier.email || '');
    setSupplierAddress(supplier.address || '');
    setSupplierActive(supplier.is_active);
    setIsSupplierDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setDeletingItem({ ...supplier, type: 'supplier' });
    setIsDeleteDialogOpen(true);
  };

  // Export Data Functionality
  const handleExportData = () => {
    let dataToExport: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (activeTab === 'suppliers') {
      dataToExport = filteredSuppliers;
      filename = 'suppliers_export.csv';
      headers = ['Supplier Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Status'];
    } else if (activeTab === 'transaction-history') {
      dataToExport = transactionHistory;
      filename = 'transaction_history_export.csv';
      headers = ['PO Number', 'Supplier', 'Branch', 'Order Date', 'Completion Date', 'Total Amount', 'Final Status', 'Payment Status', 'Payment Method'];
    } else if (activeTab === 'credit-management') {
      dataToExport = creditOrders;
      filename = 'credit_management_export.csv';
      headers = ['PO Number', 'Supplier', 'Branch', 'Order Date', 'Due Date', 'Total Amount', 'Payment Status', 'Days Until Due'];
    } else {
      dataToExport = filteredPurchaseOrders;
      filename = 'purchase_orders_export.csv';
      headers = ['PO Number', 'Supplier', 'Branch', 'Order Date', 'Expected Delivery', 'Total Amount', 'Delivery Status', 'Payment Status', 'Payment Method'];
    }

    if (dataToExport.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no data available for export.",
        variant: "destructive"
      });
      return;
    }

    const csvContent = convertToCSV(dataToExport, headers, activeTab);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success animation for export
    setSuccessAnimation({
      isVisible: true,
      title: "Export Successful!",
      message: `${dataToExport.length} ${activeTab === 'suppliers' ? 'suppliers' : activeTab === 'transaction-history' ? 'transactions' : activeTab === 'credit-management' ? 'credit orders' : 'purchase orders'} exported to ${filename}`,
      actionType: 'export'
    });
  };

  const convertToCSV = (data: any[], headers: string[], type: string) => {
    const headerRow = headers.join(',') + '\n';

    const dataRows = data.map(item => {
      if (type === 'suppliers') {
        return [
          `"${item.name || ''}"`,
          `"${item.contact_person || ''}"`,
          `"${item.phone || ''}"`,
          `"${item.email || ''}"`,
          `"${item.address || ''}"`,
          `"${item.is_active ? 'Active' : 'Inactive'}"`
        ].join(',');
      } else if (type === 'credit-management') {
        const dueDate = new Date(item.order_date);
        dueDate.setDate(dueDate.getDate() + 120);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return [
          `"${item.po_number || ''}"`,
          `"${item.supplier?.name || ''}"`,
          `"${item.branch?.name || ''}"`,
          `"${item.order_date ? new Date(item.order_date).toLocaleDateString('en-US') : ''}"`,
          `"${dueDate.toLocaleDateString('en-US')}"`,
          `"${Number(item.total_amount || 0).toFixed(2)}"`,
          `"${item.payment_status || ''}"`,
          `"${daysUntilDue}"`
        ].join(',');
      } else {
        const formattedDate = item.order_date
          ? new Date(item.order_date).toLocaleDateString('en-US')
          : '';

        const formattedDeliveryDate = item.expected_delivery_date
          ? new Date(item.expected_delivery_date).toLocaleDateString('en-US')
          : '';

        const completionDate = item.status === 'delivered' && item.expected_delivery_date
          ? new Date(item.expected_delivery_date).toLocaleDateString('en-US')
          : item.status === 'cancelled'
            ? new Date(item.updated_at || item.order_date).toLocaleDateString('en-US')
            : '';

        return [
          `"${item.po_number || ''}"`,
          `"${item.supplier?.name || ''}"`,
          `"${item.branch?.name || ''}"`,
          `"${formattedDate}"`,
          `"${type === 'transaction-history' ? completionDate : formattedDeliveryDate}"`,
          `"${Number(item.total_amount || 0).toFixed(2)}"`,
          `"${item.status || ''}"`,
          `"${item.payment_status || ''}"`,
          `"${item.payment_method || ''}"`
        ].join(',');
      }
    }).join('\n');

    return headerRow + dataRows;
  };

  const handleSubmitSupplier = async () => {
    if (!supabase || !authUser) return;
    if (!supplierName) {
      toast({ title: "Validation Error", description: "Supplier name is required.", variant: "destructive" });
      return;
    }

    setIsSupplierLoading(true);

    const supplierData = {
      name: supplierName,
      contact_person: contactPerson || null,
      phone: supplierPhone || null,
      email: supplierEmail || null,
      address: supplierAddress || null,
      is_active: supplierActive,
    };

    try {
      let error;

      if (editingSupplier) {
        const { error: updateError } = await supabase
          .from('supplier')
          // @ts-ignore
          .update(supplierData as any)
          .eq('supplier_id', editingSupplier.supplier_id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('supplier')
          // @ts-ignore
          .insert([supplierData] as any);
        error = insertError;
      }

      if (error) {
        toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } else {
        // Show success animation for supplier action
        if (editingSupplier) {
          setSuccessAnimation({
            isVisible: true,
            title: "Supplier Updated Successfully!",
            message: `Supplier "${supplierName}" has been updated in the system.`,
            actionType: 'edit'
          });
        } else {
          setSuccessAnimation({
            isVisible: true,
            title: "Supplier Added Successfully!",
            message: `Supplier "${supplierName}" has been added to the system.`,
            actionType: 'add'
          });
        }

        setIsSupplierDialogOpen(false);
        resetSupplierForm();
        fetchSuppliers();
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setIsSupplierLoading(false);
  };

  const handleSubmitPO = async () => {
    if (!supabase || !authUser) return;
    if (!poFormData.poNumber || !poFormData.selectedSupplier || !poFormData.selectedBranch) {
      toast({ title: "Validation Error", description: "PO Number, Supplier, and Branch are required.", variant: "destructive" });
      return;
    }

    // Validate delivery date must be after today (order date is now)
    if (poFormData.expectedDelivery) {
      const orderDate = new Date();
      const deliveryDate = new Date(poFormData.expectedDelivery);
      orderDate.setHours(0, 0, 0, 0);
      deliveryDate.setHours(0, 0, 0, 0);
      if (deliveryDate <= orderDate) {
        toast({
          title: "Invalid Delivery Date",
          description: "Expected delivery date must be after today's date.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate cancellation reason
    if ((poFormData.deliveryStatus === 'cancelled' || poFormData.paymentStatus === 'cancelled') && !poFormData.cancellationReason?.trim()) {
      toast({
        title: "Validation Error",
        description: "Cancellation reason is required when cancelling an order.",
        variant: "destructive"
      });
      return;
    }

    setIsPOLoading(true);

    const poData = {
      po_number: poFormData.poNumber,
      supplier_id: poFormData.selectedSupplier,
      branch_id: poFormData.selectedBranch,
      user_id: authUser.user_id,
      expected_delivery_date: poFormData.expectedDelivery || null,
      notes: poFormData.poNotes || null,
      status: editingPO ? poFormData.deliveryStatus : 'ordered',
      payment_status: poFormData.paymentStatus,
      payment_method: poFormData.paymentMethod,
      cancellation_reason: (poFormData.deliveryStatus === 'cancelled' || poFormData.paymentStatus === 'cancelled')
        ? poFormData.cancellationReason
        : null
    };

    try {
      let error;
      let poId: string | null = null;

      if (editingPO) {
        poId = editingPO.po_id;
        const { error: updateError } = await supabase
          .from('purchase_order')
          // @ts-ignore
          .update({
            ...poData,
            status: poFormData.deliveryStatus
          } as any)
          .eq('po_id', editingPO.po_id);
        error = updateError;

        // Delete existing line items and re-insert (simplest approach for updates)
        if (!error && poLineItems.length > 0) {
          await supabase.from('purchase_order_item').delete().eq('po_id', poId);
        }
      } else {
        // Insert PO and get back the ID
        const { data: insertedPO, error: insertError } = await supabase
          .from('purchase_order')
          // @ts-ignore
          .insert([poData] as any)
          .select('po_id')
          .single();
        error = insertError;
        if (insertedPO) {
          poId = (insertedPO as any).po_id;
        }
      }

      // Insert line items if PO was saved successfully
      if (!error && poId && poLineItems.length > 0) {
        const lineItemsData = poLineItems
          .filter(item => item.customName.trim() && item.quantity > 0 && item.unit_cost >= 0)
          .map(item => ({
            po_id: poId,
            item_id: item.item_id, // Will be null for custom items
            quantity: item.quantity,
            unit_cost: item.unit_cost
          }));

        if (lineItemsData.length > 0) {
          const { error: lineItemError } = await supabase
            .from('purchase_order_item')
            .insert(lineItemsData as any);

          if (lineItemError) {
            console.error('Error saving line items:', lineItemError);
            toast({
              title: "Warning",
              description: "PO saved but some line items could not be saved: " + lineItemError.message,
              variant: "destructive"
            });
          }
        }
      }

      if (error) {
        toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } else {
        // Check if status changed to 'delivered' - prompt for inventory update
        const wasNotDelivered = editingPO && editingPO.status !== 'delivered';
        const isNowDelivered = poFormData.deliveryStatus === 'delivered';

        if (wasNotDelivered && isNowDelivered) {
          // Save the PO info for inventory update confirmation
          setPendingDeliveryPO({ ...editingPO, status: 'delivered' } as PurchaseOrder);
          setIsInventoryConfirmOpen(true);
        }

        // Show success animation for PO action
        if (editingPO) {
          setSuccessAnimation({
            isVisible: true,
            title: "PO Updated Successfully!",
            message: `Purchase order ${poFormData.poNumber} has been updated.`,
            actionType: 'save'
          });
        } else {
          setSuccessAnimation({
            isVisible: true,
            title: "PO Created Successfully!",
            message: `Purchase order ${poFormData.poNumber} has been created.`,
            actionType: 'create'
          });
        }

        setIsPODialogOpen(false);
        resetPOForm();

        // Only fetch if not showing inventory confirmation (it will fetch after)
        if (!(wasNotDelivered && isNowDelivered)) {
          fetchPurchaseOrders();
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }

    setIsPOLoading(false);
  };

  const handleDelete = async () => {
    if (!supabase || !deletingItem) return;

    try {
      let error;

      if (deletingItem.type === 'supplier') {
        const { error: deleteError } = await supabase
          .from('supplier')
          .delete()
          .eq('supplier_id', deletingItem.supplier_id);
        error = deleteError;
      } else {
        const { error: deleteError } = await supabase
          .from('purchase_order')
          .delete()
          .eq('po_id', deletingItem.po_id);
        error = deleteError;
      }

      if (error) {
        toast({ title: "Delete Error", description: error.message, variant: "destructive" });
      } else {
        // Show success animation for delete action
        setSuccessAnimation({
          isVisible: true,
          title: "Item Deleted Successfully!",
          message: `${deletingItem.type === 'supplier' ? 'Supplier' : 'Purchase order'} has been removed from the system.`,
          actionType: 'delete'
        });

        setIsDeleteDialogOpen(false);
        if (deletingItem.type === 'supplier') {
          fetchSuppliers();
        } else {
          fetchPurchaseOrders();
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePaymentRecorded = () => {
    fetchPurchaseOrders();

    // Show success animation for payment
    setSuccessAnimation({
      isVisible: true,
      title: "Payment Recorded Successfully!",
      message: "Payment has been recorded and applied to the purchase order.",
      actionType: 'payment'
    });
  };

  // Handle inventory update confirmation when PO is marked as delivered
  const handleConfirmInventoryUpdate = async (addToInventory: boolean) => {
    if (!supabase || !pendingDeliveryPO) return;

    setIsInventoryConfirmOpen(false);

    if (addToInventory) {
      try {
        // Fetch the PO items for this purchase order
        const { data: poItems, error: fetchError } = await supabase
          .from('purchase_order_item')
          .select('item_id, quantity')
          .eq('po_id', pendingDeliveryPO.po_id);

        if (fetchError) {
          toast({
            title: "Error",
            description: "Could not fetch PO items: " + fetchError.message,
            variant: "destructive"
          });
          return;
        }

        if (poItems && poItems.length > 0) {
          let updatedCount = 0;
          let skippedCount = 0;

          // Update stock for each item with a valid item_id
          for (const poItem of poItems as any[]) {
            if (poItem.item_id) {
              // Get current stock
              const { data: currentItem, error: getError } = await supabase
                .from('inventory_item')
                .select('stock_quantity')
                .eq('item_id', poItem.item_id)
                .single();

              if (!getError && currentItem) {
                const newQuantity = ((currentItem as any).stock_quantity || 0) + poItem.quantity;

                // Update stock
                const { error: updateError } = await supabase
                  .from('inventory_item')
                  // @ts-ignore
                  .update({ stock_quantity: newQuantity } as any)
                  .eq('item_id', poItem.item_id);

                if (!updateError) {
                  updatedCount++;
                }
              }
            } else {
              skippedCount++; // Custom items without inventory link
            }
          }

          toast({
            title: "Inventory Updated! ✓",
            description: `${updatedCount} item(s) added to inventory.${skippedCount > 0 ? ` ${skippedCount} custom item(s) skipped.` : ''}`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to update inventory: " + error.message,
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Inventory Not Updated",
        description: "PO marked as delivered without updating inventory.",
      });
    }

    setPendingDeliveryPO(null);
    fetchPurchaseOrders();
  };

  const renderSupplierCell = (item: any, columnKey: string, value: any) => {
    if (columnKey === 'is_active') {
      return (
        <Badge
          variant={value ? 'default' : 'secondary'}
          className={`${value ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} font-poppins`}
        >
          {value ? 'Active' : 'Inactive'}
        </Badge>
      );
    }
    if (columnKey === 'contact_person' && !value) {
      return <span className="text-slate-400">No contact</span>;
    }
    if (columnKey === 'phone' && !value) {
      return <span className="text-slate-400">No phone</span>;
    }
    if (columnKey === 'email' && !value) {
      return <span className="text-slate-400">No email</span>;
    }
    return String(value || '');
  };

  // Custom table renderer for purchase orders
  const renderPOTable = (items: any[], showActions: boolean = true) => {
    if (isPOLoading && purchaseOrders.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {items.map((po) => (
          <EnhancedTableRow
            key={po.po_id}
            item={po}
            onEdit={handleEditPO}
            onDelete={handleDeletePO}
            onRowClick={handleRowClick}
          />
        ))}
      </div>
    );
  };

  // Custom table renderer for transaction history
  const renderHistoryTable = (itemsToRender?: any[]) => {
    // Use provided items or fall back to full transactionHistory
    const items = itemsToRender || transactionHistory;
    
    if (isPOLoading && purchaseOrders.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {items.map((po) => (
          <div key={po.po_id} className="grid grid-cols-9 gap-3 px-6 py-2 items-center border-b border-slate-200 hover:bg-slate-50 transition-colors text-sm cursor-pointer" onClick={() => handleEditPO(po)}>
            <div className="font-semibold text-purple-700">{po.po_number}</div>
            <div className="truncate">{po.supplier?.name || 'Unknown'}</div>
            <div className="truncate">{po.branch?.name || 'Unknown'}</div>
            <div>{po.order_date ? new Date(po.order_date).toLocaleDateString('en-US') : 'No date'}</div>
            <div>
              {po.status === 'delivered' && po.expected_delivery_date
                ? new Date(po.expected_delivery_date).toLocaleDateString('en-US')
                : po.status === 'cancelled'
                  ? new Date().toLocaleDateString('en-US')
                  : 'N/A'
              }
            </div>
            <div className="font-bold text-slate-800">
              ₱{Number(po.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div>
              <SimpleDeliveryStatus status={po.status || 'ordered'} />
            </div>
            <div>
              <SimplePaymentStatus
                status={po.payment_status || 'pending'}
                method={po.payment_method || 'cash'}
                orderDate={po.order_date}
              />
            </div>
            <div className="text-center">
              {po.notes ? (
                <button
                  className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors border border-transparent hover:border-purple-200"
                  title="View Notes"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotesClick(po.notes!);
                  }}
                >
                  <FileText className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Custom table renderer for credit management
  const renderCreditTable = () => {
    if (isPOLoading && purchaseOrders.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    const calculateDueDate = (orderDate: string) => {
      const order = new Date(orderDate);
      const dueDate = new Date(order);
      dueDate.setDate(order.getDate() + 120);
      return dueDate;
    };

    const isOverdue = (orderDate: string) => {
      const dueDate = calculateDueDate(orderDate);
      const today = new Date();
      return dueDate < today;
    };

    return (
      <div className="space-y-1">
        {creditOrders.map((po) => {
          const dueDate = calculateDueDate(po.order_date);
          const overdue = isOverdue(po.order_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div key={po.po_id} className="grid grid-cols-8 gap-3 px-3 py-2 items-center border-b border-slate-200 hover:bg-slate-50 transition-colors text-sm cursor-pointer" onClick={() => handleEditPO(po)}>
              <div className="font-semibold text-purple-700">{po.po_number}</div>
              <div className="truncate">{po.supplier?.name || 'Unknown'}</div>
              <div className="truncate">{po.branch?.name || 'Unknown'}</div>
              <div>{po.order_date ? new Date(po.order_date).toLocaleDateString('en-US') : 'No date'}</div>
              <div className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                {dueDate.toLocaleDateString('en-US')}
              </div>
              <div className="font-bold text-slate-800">
                ₱{Number(po.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div>
                <SimplePaymentStatus
                  status={po.payment_status || 'pending'}
                  method={po.payment_method || 'cash'}
                  orderDate={po.order_date}
                />
              </div>
              <div className={`text-center font-medium ${overdue ? 'text-red-600' : daysUntilDue <= 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                {overdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">

      {/* Success Animation */}
      <SuccessAnimation
        isVisible={successAnimation.isVisible}
        title={successAnimation.title}
        message={successAnimation.message}
        actionType={successAnimation.actionType}
        onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Notes Dialog */}
      <NotesDialog
        isOpen={isNotesDialogOpen}
        onClose={() => setIsNotesDialogOpen(false)}
        notes={selectedNotes}
      />

      {/* Background Sections */}
      <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
        <div
          className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/image2.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%"
          }}
        ></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300/20 rounded-br-full"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-bl-full"></div>
      </div>

      <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
      </div>

      <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">

        {/* Header Section */}
        <div className={`mb-8 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>

            <div className="relative z-10 flex-1">
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                Purchasing & Supplier Management
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                  <ShoppingCart className="h-6 w-6 opacity-90" />
                  Manage suppliers, purchase orders, and deliveries
                </p>
                <div className="flex items-center gap-4 text-lg">
                  {lastUpdated && (
                    <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                      <Clock className="w-5 h-5" />
                      Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                disabled={isSupplierLoading || isPOLoading}
                className="flex items-center gap-2 min-h-[44px] bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins active:scale-95"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isSupplierLoading || isPOLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12"></div>

        {/* Stats Overview */}
        <StatsOverview suppliers={suppliers} purchaseOrders={purchaseOrders} />

        {/* Quick Actions */}
        <EnhancedQuickActions
          onAddSupplier={handleOpenSupplierDialog}
          onAddPO={handleOpenPODialog}
          onExportData={handleExportData}
          onViewCreditTable={() => setIsCreditTableOpen(true)}
        />

        <EnhancedTabs value={activeTab} onValueChange={setActiveTab}>
          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              {/* Gradient Header */}
              <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 text-white p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-poppins">Supplier Management</div>
                    <div className="text-sm opacity-90">Manage your vendor relationships</div>
                    <div className="text-sm text-white/90 mt-1">
                      Showing: <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> suppliers
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Bar & Rows Per Page*/}
              <div className="bg-white p-5 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                  {/* Search Bar - Left side */}
                  <div className="flex-1">
                    <Label htmlFor="search-suppliers" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Search Suppliers
                    </Label>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                      <Input
                        id="search-suppliers"
                        placeholder="Search by name, contact, phone, email..."
                        value={supplierSearchTerm}
                        onChange={(e) => setSupplierSearchTerm(e.target.value)}
                        className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 transition-all rounded-md"
                      />
                      {supplierSearchTerm && (
                        <button
                          onClick={() => setSupplierSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rows per Page - Right side, label above dropdown */}
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Rows
                    </Label>
                    <Select value={String(supplierPageSize)} onValueChange={(v) => setSupplierPageSize(Number(v))}>
                      <SelectTrigger className="h-10 w-20 bg-white border-slate-200 text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Table Content */}
              <div className="p-0">
                {supplierError && (
                  <Alert variant="destructive" className="m-6 font-poppins">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{supplierError}</AlertDescription>
                  </Alert>
                )}

                {(isSupplierLoading && suppliers.length === 0) ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <DataTableWrapper
                      className="w-full border-none"
                      title=""
                      columns={[
                        ...supplierColumns,
                        {
                          key: 'supplierRef',
                          header: 'Actions',
                          render: (supplier: any) => (
                            <div className="flex justify-center items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSupplier(supplier);
                                }}
                                className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors border border-transparent"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSupplier(supplier);
                                }}
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        }
                      ] as any}
                      data={paginatedSuppliers.map(supplier => ({ 
                        ...supplier, 
                        id: supplier.supplier_id, 
                        supplierRef: supplier // This ensures the supplier object is passed to render
                      }))}
                    />
                    
                    {/* Enhanced Pagination */}
                    {filteredSuppliers.length > 0 && (
                      <EnhancedPagination
                        currentPage={supplierPage}
                        totalPages={supplierTotalPages}
                        onPageChange={setSupplierPage}
                        pageSize={supplierPageSize}
                        onPageSizeChange={setSupplierPageSize}
                        totalItems={filteredSuppliers.length}
                        displayedCount={paginatedSuppliers.length}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="space-y-6">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              {/* Gradient Header */}
              <div className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-400 text-white p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-poppins">Active Purchase Orders</div>
                    <div className="text-sm opacity-90">Track ongoing orders and deliveries</div>
                    <div className="text-sm text-white/90 mt-1">
                      Active: <strong>{filteredPurchaseOrders.length}</strong> order{filteredPurchaseOrders.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Filter Bar */}
              <POFilter
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                searchTerm={poSearchTerm}
                onSearchChange={setPOSearchTerm}
                selectedBranch={branchFilter}
                onBranchChange={setBranchFilter}
                branches={branches}
                showBranchFilter={true}
                orderDateFrom={orderDateFrom}
                orderDateTo={orderDateTo}
                onOrderDateFromChange={setOrderDateFrom}
                onOrderDateToChange={setOrderDateTo}
                rowsPerPage={poPageSize}
                onRowsPerPageChange={setPOPageSize}
              />

              {/* Table Content */}
              <div className="p-0">
                {poError && (
                  <Alert variant="destructive" className="m-6 font-poppins">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{poError}</AlertDescription>
                  </Alert>
                )}

                {filteredPurchaseOrders.length === 0 && !isPOLoading ? (
                  <div className="text-center py-6 text-slate-500 m-6">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No active purchase orders found</p>
                    <p className="text-sm mt-1">Create your first purchase order to get started</p>
                    <Button onClick={handleOpenPODialog} className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Purchase Order
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Manual Header for consistency with Inventory design */}
                    <div className="grid grid-cols-9 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider">
                      <div>PO Number</div>
                      <div>Supplier</div>
                      <div>Branch</div>
                      <div>Order Date</div>
                      <div>Expected Delivery</div>
                      <div>Total Amount</div>
                      <div>Delivery Status</div>
                      <div>Payment Status</div>
                      <div className="text-center">Actions</div>
                    </div>

                    {renderPOTable(paginatedPurchaseOrders)}

                    {filteredPurchaseOrders.length > 0 && (
                      <div className="p-0">
                        <EnhancedPagination
                          currentPage={poPage}
                          totalPages={totalPages}
                          onPageChange={setPOPage}
                          pageSize={poPageSize}
                          onPageSizeChange={setPOPageSize}
                          totalItems={filteredPurchaseOrders.length}
                          displayedCount={paginatedPurchaseOrders.length}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transaction-history" className="space-y-6">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              {/* Gradient Header */}
              <div className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 text-white p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <History className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-poppins">Transaction History</div>
                    <div className="text-sm opacity-90">Completed and cancelled orders</div>
                    <div className="text-sm text-white/90 mt-1">
                      Total: <strong>{transactionHistory.length}</strong> transactions
                    </div>
                  </div>
                </div>
                <Button onClick={handleExportData} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-lg backdrop-blur-sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export History
                </Button>
              </div>

              {/* Filter Bar */}
              <POFilter
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                searchTerm={poSearchTerm}
                onSearchChange={setPOSearchTerm}
                selectedBranch={branchFilter}
                onBranchChange={setBranchFilter}
                branches={branches}
                showBranchFilter={true}
                orderDateFrom={orderDateFrom}
                orderDateTo={orderDateTo}
                onOrderDateFromChange={setOrderDateFrom}
                onOrderDateToChange={setOrderDateTo}
                rowsPerPage={historyPageSize}
                onRowsPerPageChange={setHistoryPageSize}
              />

              {/* Table Content */}
              <div className="p-0">
                {paginatedHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 m-6">
                    <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No transaction history yet</p>
                    <p className="text-sm mt-1">Completed orders will appear here automatically</p>
                  </div>
                ) : (
                  <>
                    {/* Manual Header */}
                    <div className="grid grid-cols-9 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider">
                      <div>PO Number</div>
                      <div>Supplier</div>
                      <div>Branch</div>
                      <div>Order Date</div>
                      <div>Completion Date</div>
                      <div>Total Amount</div>
                      <div>Final Status</div>
                      <div>Payment Status</div>
                      <div className="text-center">Notes</div>
                    </div>

                    {/* Render paginated history */}
                    {renderHistoryTable(paginatedHistory)}

                    {/* Pagination */}
                    <EnhancedPagination
                      currentPage={historyPage}
                      totalPages={historyTotalPages}
                      onPageChange={setHistoryPage}
                      pageSize={historyPageSize}
                      onPageSizeChange={setHistoryPageSize}
                      totalItems={transactionHistory.length}
                      displayedCount={paginatedHistory.length}
                    />
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Credit Management Tab */}
          <TabsContent value="credit-management" className="space-y-6">
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              {/* Gradient Header */}
              <div className="w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CreditCardIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl font-bold font-poppins">Credit Management</div>
                    <div className="text-sm opacity-90">Track payments and due dates</div>
                    <div className="text-sm text-white/90 mt-1">
                      Active: <strong>{creditOrders.length}</strong> credit purchase{creditOrders.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsCreditTableOpen(true)} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center gap-2">
                    <List className="h-4 w-4" />
                    View Details
                  </Button>
                  <Button onClick={handleExportData} className="bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-lg backdrop-blur-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Credit Data
                  </Button>
                </div>
              </div>

              {/* Table Content */}
              <div className="p-0">
                {creditOrders.length === 0 && !isPOLoading ? (
                  <div className="text-center py-12 text-slate-500 m-6">
                    <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No credit purchases</p>
                    <p className="text-sm mt-1">Credit purchases will appear here automatically</p>
                  </div>
                ) : (
                  <>
                    {/* Manual Header */}
                    <div className="grid grid-cols-8 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider">
                      <div>PO Number</div>
                      <div>Supplier</div>
                      <div>Branch</div>
                      <div>Order Date</div>
                      <div>Due Date</div>
                      <div>Total Amount</div>
                      <div>Payment Status</div>
                      <div className="text-center">Days Until Due</div>
                    </div>

                    {renderCreditTable()}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </EnhancedTabs>

        <Dialog open={isSupplierDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsSupplierDialogOpen(false);
            resetSupplierForm();
          }
        }}>
          <DialogContent className="sm:max-w-lg bg-white border-0 shadow-2xl font-poppins">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900 font-poppins">
                {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-poppins">
                {editingSupplier ? 'Update supplier details below.' : 'Add a new supplier to your list.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name" className="text-slate-700 font-medium font-poppins">
                  Supplier Name *
                </Label>
                <Input
                  id="supplier-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  className="border-slate-300 focus:border-purple-500 bg-white font-poppins"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-person" className="text-slate-700 font-medium font-poppins">
                    Contact Person
                  </Label>
                  <Input
                    id="contact-person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Name"
                    className="border-slate-300 focus:border-purple-500 bg-white font-poppins"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone" className="text-slate-700 font-medium font-poppins">
                    Phone
                  </Label>
                  <Input
                    id="supplier-phone"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Phone number"
                    className="border-slate-300 focus:border-purple-500 bg-white font-poppins"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-email" className="text-slate-700 font-medium font-poppins">
                  Email
                </Label>
                <Input
                  id="supplier-email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="border-slate-300 focus:border-purple-500 bg-white font-poppins"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-address" className="text-slate-700 font-medium font-poppins">
                  Address
                </Label>
                <Textarea
                  id="supplier-address"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Full address"
                  className="border-slate-300 focus:border-purple-500 bg-white font-poppins"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 shadow-sm bg-slate-50">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium font-poppins text-slate-700">Active Status</Label>
                  <div className="text-xs text-slate-500 font-poppins">Enable or disable this supplier</div>
                </div>
                <Switch
                  checked={supplierActive}
                  onCheckedChange={setSupplierActive}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className={buttonStyles.back}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                onClick={handleSubmitSupplier} 
                disabled={isSupplierLoading || !supplierName}
                className={buttonStyles.primary}
              >
                {isSupplierLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Purchase Order Dialog - Scrollable Form */}
        <Dialog open={isPODialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsPODialogOpen(false);
            resetPOForm();
          }
        }}>
          {/* REMOVED: h-[85vh] (This was forcing a fixed height even when zoomed) */}
          {/* KEPT: max-h-[85vh] (This keeps it responsive) */}
          <DialogContent className="bg-white border-0 shadow-2xl rounded-2xl font-poppins flex flex-col fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[85vh] overflow-hidden p-0">
            
            {/* Header with padding */}
            <div className="p-6 pb-4 shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 font-poppins">
                  {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </DialogTitle>
                <DialogDescription className="text-slate-600 font-poppins">
                  {editingPO ? `Update details for PO ${editingPO.po_number}.` : 'Enter the details for the new purchase order.'}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Scrollable form area - Parent scroll handler */}
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              <EnhancedPOForm
                editingPO={editingPO}
                formData={poFormData}
                onFormChange={handlePOFormChange}
                suppliers={suppliers}
                branches={branches}
                isEditing={!!editingPO}
                onPaymentRecorded={handlePaymentRecorded}
              />

              {/* Line Items Section */}
              <div className="mt-4 pb-4">
                <POLineItems
                  items={poLineItems}
                  onItemsChange={setPOLineItems}
                  inventory={inventory}
                />
              </div>
            </div>

            {/* Footer with padding and border for separation */}
            <div className="p-6 pt-4 shrink-0 border-t border-slate-100 bg-white">
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className={buttonStyles.back}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSubmitPO}
                  disabled={isPOLoading || !poFormData.selectedSupplier || !poFormData.selectedBranch}
                  className={buttonStyles.primary}
                >
                  {isPOLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPO ? 'Save Changes' : 'Create PO'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-white border-0 shadow-2xl mt-20 font-poppins">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 font-poppins">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-poppins">
                Are you sure you want to delete this {deletingItem?.type === 'supplier' ? 'supplier' : 'purchase order'}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className={buttonStyles.back}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 font-poppins"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Inventory Update Confirmation Dialog */}
        <AlertDialog open={isInventoryConfirmOpen} onOpenChange={(open) => {
          if (!open) {
            // If closed without action, don't update inventory
            handleConfirmInventoryUpdate(false);
          }
        }}>
          <AlertDialogContent className="bg-white border-0 shadow-2xl mt-20 font-poppins">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 font-poppins flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Update Inventory Stock?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 font-poppins">
                This purchase order has been marked as <span className="font-semibold text-green-600">delivered</span>.
                Would you like to add the ordered items to your inventory stock?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => handleConfirmInventoryUpdate(false)}
                className={buttonStyles.back}
              >
                Skip
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleConfirmInventoryUpdate(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-green-600 active:scale-95 font-poppins"
              >
                <Package className="h-4 w-4 mr-2" />
                Add to Inventory
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Credit Table Dialog */}
        <CreditTableDialog
          isOpen={isCreditTableOpen}
          onClose={() => setIsCreditTableOpen(false)}
          purchaseOrders={purchaseOrders}
        />
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Custom scrollbar for dialogs */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}