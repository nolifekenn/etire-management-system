"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

interface SecureVoidModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthorized: () => void;
    actionDescription?: string;
    requiredBranchId?: string;
}

export function SecureVoidModal({
    isOpen,
    onClose,
    onAuthorized,
    actionDescription = "Only managers or admins can perform this action.",
    requiredBranchId,
}: SecureVoidModalProps) {
    const [pin, setPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) {
            setError("Please enter a PIN.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // Security Check: Query for a user with this PIN who is a manager or admin
            const { data, error } = await supabase
                .from('user')
                .select('user_id, role, name, branch_id')
                .in('role', ['branch_manager', 'super_admin'])
                .eq('pin', pin)
                .is('deleted_at', null)
                .maybeSingle();

            if (error) {
                console.error("Verification error:", error);
                setError("Verification failed. Please try again.");
            } else if (
                data &&
                requiredBranchId &&
                data.role === 'branch_manager' &&
                data.branch_id !== requiredBranchId
            ) {
                setError("This action must be authorized by a manager from the product's branch.");
            } else if (data) {
                // Success
                toast({
                    title: "Authorized",
                    description: `Action authorized by ${data.name}`,
                    variant: "default",
                    className: "bg-green-50 border-green-200 text-green-800"
                });
                setPin("");
                onAuthorized();
                onClose();
            } else {
                setError("Invalid PIN or unauthorized user.");
            }
        } catch (err) {
            console.error("Exception during verification:", err);
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setPin("");
            setError("");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-red-100 p-3 rounded-full mb-2">
                        <Lock className="h-6 w-6 text-red-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Manager Authorization Required</DialogTitle>
                    <DialogDescription className="text-center">
                        {actionDescription}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleVerify} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="pin" className="text-center block text-slate-600">
                            Enter Manager PIN
                        </Label>
                        <div className="relative">
                            <Input
                                id="pin"
                                type="password"
                                placeholder="••••••"
                                className="text-center text-2xl tracking-[0.5em] h-14 font-bold border-slate-300 focus:border-red-400 focus:ring-red-100"
                                value={pin}
                                onChange={(e) => {
                                    // Only allow numbers if desired, or any char
                                    setPin(e.target.value);
                                    setError("");
                                }}
                                maxLength={6}
                                autoFocus
                                disabled={isLoading}
                            />
                            <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 h-6 w-6" />
                        </div>
                        {error && (
                            <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded animate-in fade-in slide-in-from-top-1 duration-200">
                                <AlertTriangle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={isLoading || pin.length < 1}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Authorize Void"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
