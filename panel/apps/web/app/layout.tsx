import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "l7v-panel",
    description: "NixOS Control Center",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>
                    <div className="flex h-screen overflow-hidden">
                        <Sidebar />
                        <div className="flex flex-1 flex-col overflow-hidden">
                            <Header />
                            <main className="flex-1 overflow-auto p-4">{children}</main>
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
