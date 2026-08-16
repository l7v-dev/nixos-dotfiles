import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { MainLayout } from "@/components/layout/MainLayout";

export const metadata: Metadata = {
    title: "l7v-panel · NixOS Control Center",
    description: "Declarative Infrastructure, AI Workloads & Multi-Node Fleet Management",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="font-sans antialiased text-foreground bg-background" suppressHydrationWarning>
                <Providers>
                    <MainLayout>{children}</MainLayout>
                </Providers>
            </body>
        </html>
    );
}
