import { Suspense } from "react";
import {
    getForgejoStats,
    getVaultwardenHealth,
} from "@/actions/forgejo";
import { NtfyForm } from "@/components/integrations/NtfyForm";

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Integrations</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<SkeletonCard title="Forgejo" />}>
                    <ForgejoCard />
                </Suspense>
                <Suspense fallback={<SkeletonCard title="Vaultwarden" />}>
                    <VaultwardenCard />
                </Suspense>
                <Suspense fallback={<SkeletonCard title="ntfy" />}>
                    <NtfyForm />
                </Suspense>
            </div>
        </div>
    );
}

async function ForgejoCard() {
    try {
        const stats = await getForgejoStats();
        return (
            <IntCard title="Forgejo" status="ok">
                <p className="text-sm text-muted-foreground">
                    Repos: <span className="font-medium text-foreground">{stats.repoCount}</span>
                </p>
            </IntCard>
        );
    } catch {
        return <IntCard title="Forgejo" status="error">Could not reach git.l7v.dev</IntCard>;
    }
}

async function VaultwardenCard() {
    try {
        const health = await getVaultwardenHealth();
        return (
            <IntCard title="Vaultwarden" status={health.alive ? "ok" : "error"}>
                <p className="text-sm text-muted-foreground">
                    {health.alive ? "Operational" : "Unreachable"}
                </p>
            </IntCard>
        );
    } catch {
        return <IntCard title="Vaultwarden" status="error">Could not reach vault.l7v.dev</IntCard>;
    }
}

function IntCard({
    title, status, children,
}: {
    title: string;
    status: "ok" | "error";
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{title}</h2>
                <span
                    className={`inline-flex h-2 w-2 rounded-full ${status === "ok" ? "bg-green-500" : "bg-red-500"}`}
                />
            </div>
            {children}
        </div>
    );
}

function SkeletonCard({ title }: { title: string }) {
    return (
        <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <h2 className="text-sm font-semibold mb-2">{title}</h2>
            <div className="h-4 bg-muted rounded w-3/4" />
        </div>
    );
}
