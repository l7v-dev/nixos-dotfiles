"use client";

import React, { useState } from "react";
import {
    Boxes,
    Layers,
    Disc,
    HardDrive,
    Network,
    RefreshCw,
    Plus,
    Activity,
    Shield,
} from "lucide-react";
import { useContainers, useContainerOverview } from "@/hooks/useContainers";
import { ContainerStatsCards } from "@/components/containers/ContainerStatsCards";
import { ContainerTable } from "@/components/containers/ContainerTable";
import { ContainerDetailDrawer } from "@/components/containers/ContainerDetailDrawer";
import { CreateContainerModal } from "@/components/containers/CreateContainerModal";
import { ImageManagementTab } from "@/components/containers/ImageManagementTab";
import { VolumeManagementTab } from "@/components/containers/VolumeManagementTab";
import { NetworkManagementTab } from "@/components/containers/NetworkManagementTab";
import { StackManagementTab } from "@/components/containers/StackManagementTab";

export default function ContainersPage() {
    const [activeTab, setActiveTab] = useState<
        "containers" | "stacks" | "images" | "volumes" | "networks"
    >("containers");
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const {
        data: containersData,
        isLoading: isContainersLoading,
        refetch: refetchContainers,
        isFetching,
    } = useContainers({ all: true });

    const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } =
        useContainerOverview();

    const handleRefreshAll = () => {
        refetchContainers();
        refetchOverview();
    };

    const containers = containersData?.containers || [];

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Boxes className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">
                                Kapsayıcı Yönetimi
                            </h1>
                            {overview?.engine && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                                    <Activity className="h-3 w-3" />
                                    {overview.engine.toUpperCase()}{" "}
                                    {overview.engineVersion ? `v${overview.engineVersion}` : ""}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Podman & Docker OCI kapsayıcıları, yığınlar, imajlar, kalıcı diskler ve sanal ağlar.
                        </p>
                    </div>
                </div>

                {/* Right Header Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefreshAll}
                        disabled={isFetching}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        Yenile
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Yeni Kapsayıcı
                    </button>
                </div>
            </div>

            {/* Overview KPI Cards */}
            <ContainerStatsCards overview={overview} isLoading={isOverviewLoading} />

            {/* Tab Navigation */}
            <div className="border-b border-border">
                <nav className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab("containers")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "containers"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Boxes className="h-4 w-4" />
                        Kapsayıcılar
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {containers.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("stacks")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "stacks"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Yığınlar / Podlar (Stacks)
                    </button>

                    <button
                        onClick={() => setActiveTab("images")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "images"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Disc className="h-4 w-4" />
                        İmajlar (Images)
                        {overview?.totalImages !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {overview.totalImages}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("volumes")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "volumes"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <HardDrive className="h-4 w-4" />
                        Kalıcı Birimler (Volumes)
                        {overview?.totalVolumes !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {overview.totalVolumes}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("networks")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "networks"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Network className="h-4 w-4" />
                        Sanal Ağlar (Networks)
                        {overview?.totalNetworks !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {overview.totalNetworks}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Tab Views */}
            <div className="pt-2">
                {activeTab === "containers" && (
                    <ContainerTable
                        containers={containers}
                        isLoading={isContainersLoading}
                        onSelectContainer={(id) => setSelectedContainerId(id)}
                        onOpenCreateModal={() => setIsCreateModalOpen(true)}
                    />
                )}

                {activeTab === "stacks" && (
                    <StackManagementTab
                        onSelectContainer={(id) => setSelectedContainerId(id)}
                    />
                )}

                {activeTab === "images" && <ImageManagementTab />}

                {activeTab === "volumes" && <VolumeManagementTab />}

                {activeTab === "networks" && <NetworkManagementTab />}
            </div>

            {/* Right-side Detail Drawer */}
            <ContainerDetailDrawer
                containerId={selectedContainerId}
                onClose={() => setSelectedContainerId(null)}
            />

            {/* Create Container Wizard Modal */}
            <CreateContainerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
