import { Suspense } from "react";
import {
    getForgejoStats,
    getVaultwardenHealth,
} from "@/actions/forgejo";
import { queryPrometheus } from "@/actions/prometheus";
import { NtfyForm } from "@/components/integrations/NtfyForm";

export default function IntegrationsPage() {
    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-lg font-semibold">Entegrasyonlar</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Harici servis durumları ve bildirimler
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Suspense fallback={<SkeletonCard title="Forgejo" />}>
                    <ForgejoCard />
                </Suspense>
                <Suspense fallback={<SkeletonCard title="Vaultwarden" />}>
                    <VaultwardenCard />
                </Suspense>
                <Suspense fallback={<SkeletonCard title="Prometheus" />}>
                    <PrometheusCard />
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
            <IntCard title="Forgejo" status="ok" href="https://git.l7v.dev">
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <Stat label="Repo" value={stats.repoCount} />
                    <Stat label="Kullanıcı" value={stats.userCount} />
                </div>
            </IntCard>
        );
    } catch {
        return (
            <IntCard title="Forgejo" status="error">
                <p className="text-xs text-muted-foreground">git.l7v.dev erişilemiyor</p>
            </IntCard>
        );
    }
}

async function VaultwardenCard() {
    try {
        const health = await getVaultwardenHealth();
        return (
            <IntCard title="Vaultwarden" status={health.alive ? "ok" : "error"} href="https://vault.l7v.dev">
                <p className="mt-1 text-xs text-muted-foreground">
                    {health.alive ? "Çalışıyor" : "Erişilemiyor"}
                </p>
            </IntCard>
        );
    } catch {
        return (
            <IntCard title="Vaultwarden" status="error">
                <p className="text-xs text-muted-foreground">vault.l7v.dev erişilemiyor</p>
            </IntCard>
        );
    }
}

async function PrometheusCard() {
    try {
        const [uptimeRes, targetsRes] = await Promise.allSettled([
            queryPrometheus("up"),
            queryPrometheus('count(up == 1)'),
        ]);

        const targets = targetsRes.status === "fulfilled"
            ? (targetsRes.value.data.result[0] as { value?: [number, string] } | undefined)?.value?.[1]
            : null;

        const upCount = targets ? parseInt(targets, 10) : null;

        const totalTargets = uptimeRes.status === "fulfilled"
            ? uptimeRes.value.data.result.length
            : null;

        return (
            <IntCard title="Prometheus" status="ok" href="http://127.0.0.1:9090">
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <Stat label="Aktif" value={upCount ?? "—"} />
                    <Stat label="Toplam" value={totalTargets ?? "—"} />
                </div>
            </IntCard>
        );
    } catch {
        return (
            <IntCard title="Prometheus" status="error">
                <p className="text-xs text-muted-foreground">:9090 erişilemiyor</p>
            </IntCard>
        );
    }
}

/* ─── Primitives ─── */

function IntCard({
    title, status, href, children,
}: {
    title: string;
    status: "ok" | "error";
    href?: string;
    children: React.ReactNode;
}) {
    const titleEl = href ? (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline"
        >
            {title} ↗
        </a>
    ) : (
        <span className="text-sm font-semibold">{title}</span>
    );

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
                {titleEl}
                <span
                    className={`inline-flex h-2 w-2 rounded-full ${status === "ok" ? "bg-green-500" : "bg-destructive"
                        }`}
                />
            </div>
            {children}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-center">
            <p className="text-lg font-semibold tabular-nums">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
    );
}

function SkeletonCard({ title }: { title: string }) {
    return (
        <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
                <span className="h-2 w-2 rounded-full bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-md bg-muted" />
                <div className="h-12 rounded-md bg-muted" />
            </div>
        </div>
    );
}
