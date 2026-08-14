"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ChartSectionProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
    actions?: React.ReactNode;
}

export function ChartSection({
    title,
    subtitle,
    children,
    isLoading,
    isError,
    onRetry,
    actions,
}: ChartSectionProps) {
    return (
        <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-medium">{title}</h2>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {isLoading ? (
                <div className="flex h-48 w-full animate-pulse items-center justify-center rounded-md bg-muted/40">
                    <div className="h-4 w-24 rounded bg-muted" />
                </div>
            ) : isError ? (
                <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-xs text-destructive">Failed to load chart data</p>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                        </button>
                    )}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
