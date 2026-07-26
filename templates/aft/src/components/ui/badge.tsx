import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variants = {
    default: "border-transparent bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    secondary: "border-transparent bg-zinc-800 text-zinc-100",
    outline: "text-zinc-400 border-zinc-700",
    destructive: "border-transparent bg-red-500/10 text-red-400 border-red-500/20",
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}
