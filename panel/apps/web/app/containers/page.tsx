"use client";

import React, { useState } from "react";
import {
    Boxes,
    Plus,
    RefreshCw,
    Layers,
    Disc,
    HardDrive,
    Network,
    Activity,
} from "lucide-react";
import { useContainers, useContainerOverview } from "@/hooks/useContainers";
import { ContainerStatsCards } from "@/components/containers/ContainerStatsCards";
import { ContainerTable } from "@/components/containers/ContainerTable";
import { ContainerDetailDrawer } from "@/components/containers/ContainerDetailDrawer";
import { CreateContainerModal } from "@/components/containers/CreateContainerModal";
import { StackManagementTab } from "@/components/containers/StackManagementTab";
import { ImageManagementTab } from "@/components/containers/ImageManagementTab";
import { VolumeManagementTab } from "@/components/containers/VolumeManagementTab";
import { NetworkManagementTab } from "@/components/containers/NetworkManagementTab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type TabType = "containers" | "stacks" | "images" | "volumes" | "networks";

export default function ContainersPage() {
    const [activeTab, setActiveTab] = useState<TabType>("containers");
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const {
        data: containersData,
        isLoading: isContainersLoading,
        isFetching: isContainersFetching,
        refetch: refetchContainers,
    } = useContainers();

    const {
        data: overview,
        isLoading: isOverviewLoading,
        isFetching: isOverviewFetching,
        refetch: refetchOverview,
    } = useContainerOverview();

    const isFetching = isContainersFetching || isOverviewFetching;

    const handleRefreshAll = () => {
        refetchContainers();
        refetchOverview();
    };

    const containers = containersData?.containers || [];

    return (
        <div className="flex-1 space-y-6 p-6 font-sans">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border text-foreground">
                        <Boxes className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">
                                Containers & Pods
                            </h1>
                            {overview?.engine && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    <Activity className="h-3 w-3 mr-1 text-primary" strokeWidth={1.5} />
                                    {overview.engine.toUpperCase()}{" "}
                                    {overview.engineVersion ? `v${overview.engineVersion}` : ""}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Podman & Docker OCI runtime, compose stacks, images, volumes, and bridge networks.
                        </p>
                    </div>
                </div>

                {/* Right Header Controls */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        disabled={isFetching}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.5} />
                        <span>Refresh</span>
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="gap-1.5 shadow-sm"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        <span>New Container</span>
                    </Button>
                </div>
            </div>

            {/* Overview KPI Cards */}
            <ContainerStatsCards overview={overview} isLoading={isOverviewLoading} />

            {/* Tab Navigation */}
            <div className="border-b border-border/70">
                <nav className="flex space-x-6">
                    <button
                        onClick={() => setActiveTab("containers")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "containers"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Boxes className="h-4 w-4" strokeWidth={1.5} />
                        <span>Containers</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
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
                        <Layers className="h-4 w-4" strokeWidth={1.5} />
                        <span>Stacks & Pods</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("images")}
                        className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
                            activeTab === "images"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Disc className="h-4 w-4" strokeWidth={1.5} />
                        <span>Images</span>
                        {overview?.totalImages !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
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
                        <HardDrive className="h-4 w-4" strokeWidth={1.5} />
                        <span>Volumes</span>
                        {overview?.totalVolumes !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
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
                        <Network className="h-4 w-4" strokeWidth={1.5} />
                        <span>Networks</span>
                        {overview?.totalNetworks !== undefined && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-mono">
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
