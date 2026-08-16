import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
    {
        variants: {
            variant: {
                default:
                    "bg-foreground text-background shadow-xs hover:bg-foreground/90 font-semibold",
                primary:
                    "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 font-semibold",
                brand:
                    "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 font-semibold",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 font-semibold",
                outline:
                    "border border-border/90 bg-card text-foreground hover:bg-accent/80 hover:border-foreground/30 shadow-xs",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium",
                ghost:
                    "text-muted-foreground hover:bg-accent/70 hover:text-foreground font-medium",
                link:
                    "text-primary underline-offset-4 hover:underline",
                subtle:
                    "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40",
            },
            size: {
                default: "h-8 px-3.5 py-1.5 text-xs rounded-full",
                xs: "h-6 px-2.5 text-[11px] rounded-full",
                sm: "h-7 px-3 text-xs rounded-full",
                lg: "h-9 px-5 text-sm rounded-full",
                icon: "h-8 w-8 rounded-full",
                iconSm: "h-6 w-6 rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
