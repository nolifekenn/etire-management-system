"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public handleReload = () => {
        window.location.reload();
    };

    public handleGoHome = () => {
        window.location.href = "/dashboard";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-poppins">
                    <Card className="max-w-md w-full shadow-2xl border-0">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-500">
                                <AlertTriangle className="h-10 w-10 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-slate-800">Something went wrong</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-slate-500">
                                we're likely tracking this issue, but you can try refreshing the page or going back to the dashboard.
                            </p>
                            {this.state.error && (
                                <div className="bg-red-50 p-3 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono text-red-800 border border-red-100">
                                    {this.state.error.toString()}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
                            <Button
                                onClick={this.handleReload}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Reload Page
                            </Button>
                            <Button
                                onClick={this.handleGoHome}
                                variant="outline"
                                className="w-full gap-2 border-slate-300 hover:bg-slate-50"
                            >
                                <Home className="h-4 w-4" />
                                Dashboard
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
