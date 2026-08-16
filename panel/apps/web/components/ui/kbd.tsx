import * as React from "react";
import { cn } from "@/lib/utils";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
    return (
        <kbd
            className={cn(
                "inline-flex h-5 items-center justify-center rounded border border-border/80 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-xs select-none",
                className
            )}
            {...props}
        >
            {children}
        </kbd>
    );
}
