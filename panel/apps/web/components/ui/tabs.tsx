"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}

export function Tabs({
    value: controlledValue,
    defaultValue,
    onValueChange,
    className,
    children,
    ...props
}: TabsProps) {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
        defaultValue || ""
    );
    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

    const handleValueChange = React.useCallback(
        (newValue: string) => {
            if (controlledValue === undefined) {
                setUncontrolledValue(newValue);
            }
            onValueChange?.(newValue);
        },
        [controlledValue, onValueChange]
    );

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={cn("space-y-4", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function TabsList({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "inline-flex h-9 items-center justify-start rounded-xl border border-border/80 bg-muted/40 p-1 text-muted-foreground shadow-xs",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

interface TabsTriggerProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

export function TabsTrigger({
    value,
    className,
    children,
    ...props
}: TabsTriggerProps) {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error("TabsTrigger must be used within Tabs");
    }

    const isSelected = context.value === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => context.onValueChange(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
                isSelected
                    ? "bg-card text-foreground font-semibold shadow-xs ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
}

export function TabsContent({
    value,
    className,
    children,
    ...props
}: TabsContentProps) {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error("TabsContent must be used within Tabs");
    }

    if (context.value !== value) return null;

    return (
        <div
            role="tabpanel"
            className={cn(
                "mt-2 ring-offset-background focus-visible:outline-none animate-in fade-in-50 duration-200",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
