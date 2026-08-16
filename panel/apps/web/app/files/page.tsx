"use client";

import React, { useState, useEffect } from "react";
import { useFileStore } from "@/store/file-store";
import { useDirectory, useFileMutations } from "@/hooks/useFiles";
import { FileBreadcrumbs } from "@/components/files/FileBreadcrumbs";
import { FileTreeSidebar } from "@/components/files/FileTreeSidebar";
import { FileGrid } from "@/components/files/FileGrid";
import { FileTable } from "@/components/files/FileTable";
import { FileContextMenu } from "@/components/files/FileContextMenu";
import { FileEditorModal } from "@/components/files/FileEditorModal";
import { FileViewerModal } from "@/components/files/FileViewerModal";
import { FilePermissionsModal } from "@/components/files/FilePermissionsModal";
import { ArchiveModal } from "@/components/files/ArchiveModal";
import { FileUploadDropzone } from "@/components/files/FileUploadDropzone";
import { CreateItemModal } from "@/components/files/CreateItemModal";
import { RenameModal } from "@/components/files/RenameModal";
import { DeleteConfirmModal } from "@/components/files/DeleteConfirmModal";
import { FileSearchOverlay } from "@/components/files/FileSearchOverlay";
import { FileDetailDrawer } from "@/components/files/FileDetailDrawer";
import { useHostStore } from "@/store/host-store";
import { useTerminalStore, dispatchTerminalInput } from "@/store/terminal-store";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileSystemItem, SearchMatch } from "@/types/files";

export default function FilesPage() {
    const {
        currentPath,
        navigate,
        showHidden,
        toggleHidden,
        viewMode,
        sortField,
        sortOrder,
        selectedPaths,
        selectPath,
        selectAll,
        clearSelection,
        clipboard,
        copySelected,
        cutSelected,
        clearClipboard,
    } = useFileStore();

    const selectedHost = useHostStore((s) => s.selectedHost);
    const { addTab } = useTerminalStore();
    const router = useRouter();

    const { data: dirData, isLoading, isRefetching, error, refetch } = useDirectory(
        currentPath,
        showHidden,
        sortField,
        sortOrder
    );

    const { copyPath, renamePath, uploadFiles } = useFileMutations();

    // Modal / Drawer states
    const [editorPath, setEditorPath] = useState<string | null>(null);
    const [viewerPath, setViewerPath] = useState<string | null>(null);
    const [permItem, setPermItem] = useState<FileSystemItem | null>(null);
    const [renameItem, setRenameItem] = useState<FileSystemItem | null>(null);
    const [detailItem, setDetailItem] = useState<FileSystemItem | null>(null);
    const [deletePaths, setDeletePaths] = useState<string[]>([]);
    const [createModal, setCreateModal] = useState<{ mode: "file" | "folder" } | null>(null);
    const [archiveModal, setArchiveModal] = useState<{
        mode: "compress" | "extract";
        targetPaths?: string[];
        extractItem?: FileSystemItem | null;
    } | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        item?: FileSystemItem;
    } | null>(null);

    // Drag-over drop overlay state
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const files = dirData?.files || [];
    const allPaths = files.map((f) => f.path);

    // Primary action on double click / open
    const handleOpenItem = (item: FileSystemItem) => {
        if (item.is_dir) {
            navigate(item.path);
        } else {
            const ext = (item.extension || "").toLowerCase();
            const isMediaOrBinary = [
                ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".ico",
                ".mp4", ".webm", ".mkv", ".mov",
                ".mp3", ".wav", ".flac", ".ogg",
                ".pdf",
            ].includes(ext);

            if (isMediaOrBinary) {
                setViewerPath(item.path);
            } else {
                setEditorPath(item.path);
            }
        }
    };

    // Paste handler
    const handlePaste = async () => {
        if (!clipboard || clipboard.paths.length === 0) return;

        for (const src of clipboard.paths) {
            const fileName = src.split("/").pop() || "";
            const dst = `${currentPath}/${fileName}`;
            if (src === dst) continue;

            if (clipboard.mode === "cut") {
                await renamePath.mutateAsync({ oldPath: src, newPath: dst });
            } else {
                await copyPath.mutateAsync({ srcPath: src, dstPath: dst, overwrite: true });
            }
        }

        if (clipboard.mode === "cut") {
            clearClipboard();
        }
    };

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is an input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
                if (selectedPaths.length > 0) {
                    e.preventDefault();
                    copySelected();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
                if (selectedPaths.length > 0) {
                    e.preventDefault();
                    cutSelected();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                if (clipboard) {
                    e.preventDefault();
                    handlePaste();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                e.preventDefault();
                selectAll(allPaths);
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
                e.preventDefault();
                toggleHidden();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                setIsSearchOpen(true);
            } else if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedPaths.length > 0) {
                    e.preventDefault();
                    setDeletePaths(selectedPaths);
                }
            } else if (e.key === "F2" && selectedPaths.length === 1) {
                const item = files.find((f) => f.path === selectedPaths[0]);
                if (item) {
                    e.preventDefault();
                    setRenameItem(item);
                }
            } else if (e.key === "Escape") {
                clearSelection();
                setContextMenu(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedPaths, clipboard, currentPath, files, allPaths]);

    // Handle Search Match selection
    const handleSelectMatch = (match: SearchMatch) => {
        if (match.is_dir) {
            navigate(match.path);
        } else {
            const parent = match.path.substring(0, match.path.lastIndexOf("/"));
            navigate(parent === "" ? "/" : parent);
            setEditorPath(match.path);
        }
    };

    // Check for flake or devenv in current directory
    const hasFlake = files.some((f) => f.name === "flake.nix");
    const hasDevenv = files.some((f) => f.name === "devenv.nix");

    const handleLaunchDevshell = () => {
        addTab(selectedHost, `devshell: ${currentPath.split("/").pop() || "root"}`);
        setTimeout(() => {
            dispatchTerminalInput(`cd ${currentPath} && nix develop\n`);
        }, 300);
        router.push("/terminal");
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDraggingOver(false);
                }
            }}
            onDrop={async (e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    try {
                        await uploadFiles(currentPath, Array.from(e.dataTransfer.files));
                    } catch {
                        // handled
                    }
                }
            }}
            className="flex-1 flex flex-col gap-3 min-h-0 relative select-none"
        >
            {/* Drag & Drop Canvas Overlay */}
            {isDraggingOver && (
                <div className="absolute inset-0 z-40 bg-emerald-950/70 border-2 border-dashed border-emerald-400 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none backdrop-blur-sm animate-in fade-in duration-100">
                    <Sparkles className="w-12 h-12 text-emerald-400 animate-bounce" />
                    <span className="text-sm font-semibold text-emerald-100">
                        Dosyaları &quot;{currentPath}&quot; dizinine yüklemek için bırakın
                    </span>
                </div>
            )}

            {/* Breadcrumbs & Action Toolbar */}
            <FileBreadcrumbs
                git={dirData?.git}
                onNewFile={() => setCreateModal({ mode: "file" })}
                onNewFolder={() => setCreateModal({ mode: "folder" })}
                onUpload={() => setIsUploadOpen(true)}
                onToggleSearch={() => setIsSearchOpen(true)}
                isSearching={isSearchOpen}
                onRefresh={() => refetch()}
                isRefreshing={isRefetching}
            />

            {/* Flake / Devshell Banner */}
            {(hasFlake || hasDevenv) && (
                <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                        <span className="text-foreground">
                            Nix development environment detected (<span className="font-semibold text-primary font-mono">{hasFlake ? "flake.nix" : "devenv.nix"}</span>).
                        </span>
                    </div>
                    <Button
                        size="xs"
                        variant="default"
                        onClick={handleLaunchDevshell}
                        className="gap-1.5"
                    >
                        <Terminal className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Launch DevShell</span>
                    </Button>
                </div>
            )}

            {/* Main Split-Pane Workspace */}
            <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
                {/* Left Sidebar: Tree & Bookmarks */}
                <FileTreeSidebar freeSpace={dirData?.free_space} />

                {/* Center Files Viewport */}
                <main
                    onClick={() => {
                        clearSelection();
                        setContextMenu(null);
                    }}
                    className="flex-1 flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 backdrop-blur-md overflow-y-auto no-scrollbar relative"
                >
                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                            <span className="text-xs">Dizin yükleniyor...</span>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-rose-400 p-8 text-center">
                            <AlertCircle className="w-10 h-10" />
                            <span className="text-sm font-semibold">Dizin okunamadı</span>
                            <span className="text-xs text-zinc-500 max-w-md">
                                {(error as Error)?.message || "İzin reddedildi veya dizin mevcut değil."}
                            </span>
                        </div>
                    ) : viewMode === "grid" ? (
                        <FileGrid
                            files={files}
                            onOpen={handleOpenItem}
                            onContextMenu={(e, item) => {
                                setContextMenu({ x: e.clientX, y: e.clientY, item });
                            }}
                        />
                    ) : (
                        <FileTable
                            files={files}
                            onOpen={handleOpenItem}
                            onContextMenu={(e, item) => {
                                setContextMenu({ x: e.clientX, y: e.clientY, item });
                            }}
                        />
                    )}
                </main>

                {/* Right Drawer: Detail View */}
                {detailItem && (
                    <FileDetailDrawer
                        item={detailItem}
                        onClose={() => setDetailItem(null)}
                        onEdit={(item) => setEditorPath(item.path)}
                        onPreview={(item) => setViewerPath(item.path)}
                        onPermissions={(item) => setPermItem(item)}
                        onDelete={(item) => setDeletePaths([item.path])}
                    />
                )}
            </div>

            {/* Right-click Context Menu */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    targetItem={contextMenu.item}
                    selectedCount={selectedPaths.length}
                    clipboardHasItems={!!clipboard && clipboard.paths.length > 0}
                    onClose={() => setContextMenu(null)}
                    onOpen={(item) => handleOpenItem(item)}
                    onEdit={(item) => setEditorPath(item.path)}
                    onPreview={(item) => setViewerPath(item.path)}
                    onCut={() => cutSelected()}
                    onCopy={() => copySelected()}
                    onPaste={handlePaste}
                    onRename={(item) => setRenameItem(item)}
                    onPermissions={(item) => setPermItem(item)}
                    onArchive={() =>
                        setArchiveModal({
                            mode: "compress",
                            targetPaths: selectedPaths.length > 0 ? selectedPaths : (contextMenu.item ? [contextMenu.item.path] : []),
                        })
                    }
                    onExtract={(item) =>
                        setArchiveModal({
                            mode: "extract",
                            extractItem: item,
                        })
                    }
                    onDownload={(item) => {
                        const url = `/api/agent/${encodeURIComponent(selectedHost)}/api/v1/fs/download?path=${encodeURIComponent(item.path)}`;
                        window.open(url, "_blank");
                    }}
                    onDelete={() => setDeletePaths(selectedPaths.length > 0 ? selectedPaths : (contextMenu.item ? [contextMenu.item.path] : []))}
                    onOpenTerminal={() => {
                        const target = contextMenu.item ? (contextMenu.item.is_dir ? contextMenu.item.path : currentPath) : currentPath;
                        addTab(selectedHost, `shell: ${target.split("/").pop() || "root"}`);
                        setTimeout(() => {
                            dispatchTerminalInput(`cd ${target}\n`);
                        }, 300);
                        router.push("/terminal");
                    }}
                />
            )}

            {/* Modals */}
            <FileEditorModal
                filePath={editorPath}
                onClose={() => setEditorPath(null)}
            />

            <FileViewerModal
                filePath={viewerPath}
                onClose={() => setViewerPath(null)}
            />

            <FilePermissionsModal
                item={permItem}
                onClose={() => setPermItem(null)}
            />

            <CreateItemModal
                mode={createModal?.mode || "file"}
                currentPath={currentPath}
                isOpen={!!createModal}
                onClose={() => setCreateModal(null)}
                onCreatedFile={(p) => setEditorPath(p)}
            />

            <RenameModal
                item={renameItem}
                onClose={() => setRenameItem(null)}
            />

            {archiveModal && (
                <ArchiveModal
                    mode={archiveModal.mode}
                    targetPaths={archiveModal.targetPaths}
                    extractItem={archiveModal.extractItem}
                    currentPath={currentPath}
                    onClose={() => setArchiveModal(null)}
                />
            )}

            <FileUploadDropzone
                targetDir={currentPath}
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
            />

            <DeleteConfirmModal
                paths={deletePaths}
                isOpen={deletePaths.length > 0}
                onClose={() => setDeletePaths([])}
            />

            <FileSearchOverlay
                currentPath={currentPath}
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelectMatch={handleSelectMatch}
            />
        </div>
    );
}
