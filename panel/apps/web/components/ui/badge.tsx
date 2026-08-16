import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium font-mono transition-colors select-none",
    {
        variants: {
            variant: {
                default:
                    "border-primary/20 bg-primary/10 text-primary font-semibold",
                secondary:
                    "border-border/60 bg-secondary text-secondary-foreground",
                destructive:
                    "border-destructive/30 bg-destructive/10 text-destructive font-semibold",
                outline:
                    "border-border bg-card text-foreground",
                success:
                    "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
                warning:
                    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
                info:
                    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold",
                ai:
                    "border-primary/25 bg-primary/10 text-primary font-semibold",
                muted:
                    "border-border/60 bg-muted/60 text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
