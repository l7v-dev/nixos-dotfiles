"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import dynamic from "next/dynamic";

const QuakeDrawer = dynamic(
    () => import("@/components/terminal/QuakeDrawer").then((mod) => mod.QuakeDrawer),
    { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <QuakeDrawer />
            {children}
        </QueryClientProvider>
    );
}
