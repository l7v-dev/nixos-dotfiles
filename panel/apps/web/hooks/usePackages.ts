"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    NixPackage,
    PackageSearchResponse,
    OptionSearchResponse,
    InstalledPackagesResponse,
    OptionScope,
    ChannelOption,
} from "@/types/packages";

export function usePackageSearch(
    query: string,
    channel: ChannelOption = "nixos-unstable",
    limit: number = 40,
    options?: { enabled?: boolean }
) {
    const host = useHostStore((s) => s.selectedHost);
    const trimmed = query.trim();

    return useQuery<PackageSearchResponse>({
        queryKey: ["packages-search", host, trimmed, channel, limit],
        queryFn: () =>
            fetchAgent<PackageSearchResponse>(
                host,
                `/api/v1/packages/search?q=${encodeURIComponent(trimmed)}&channel=${encodeURIComponent(
                    channel
                )}&limit=${limit}`
            ),
        enabled: (options?.enabled ?? true) && trimmed.length >= 2,
        staleTime: 60_000,
    });
}

export function useOptionSearch(
    query: string,
    channel: ChannelOption = "nixos-unstable",
    scope: OptionScope = "all",
    limit: number = 40,
    options?: { enabled?: boolean }
) {
    const host = useHostStore((s) => s.selectedHost);
    const trimmed = query.trim();

    return useQuery<OptionSearchResponse>({
        queryKey: ["options-search", host, trimmed, channel, scope, limit],
        queryFn: () =>
            fetchAgent<OptionSearchResponse>(
                host,
                `/api/v1/packages/options?q=${encodeURIComponent(trimmed)}&channel=${encodeURIComponent(
                    channel
                )}&scope=${encodeURIComponent(scope)}&limit=${limit}`
            ),
        enabled: (options?.enabled ?? true) && trimmed.length >= 2,
        staleTime: 60_000,
    });
}

export function useInstalledPackages() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<InstalledPackagesResponse>({
        queryKey: ["packages-installed", host],
        queryFn: () => fetchAgent<InstalledPackagesResponse>(host, "/api/v1/packages/installed"),
        staleTime: 30_000,
    });
}

export function usePackageInfo(name: string, channel: ChannelOption = "nixos-unstable") {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<NixPackage>({
        queryKey: ["package-info", host, name, channel],
        queryFn: () =>
            fetchAgent<NixPackage>(
                host,
                `/api/v1/packages/info?name=${encodeURIComponent(name)}&channel=${encodeURIComponent(channel)}`
            ),
        enabled: !!name,
        staleTime: 60_000,
    });
}
