"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    DirectoryListResponse,
    FileContentResponse,
    FileSystemItem,
    SearchResponse,
    GitInfo,
    WriteFilePayload,
    ChmodPayload,
    ArchivePayload,
    ExtractPayload,
    FileSortField,
    FileSortOrder,
} from "@/types/files";

export function useDirectory(
    path: string,
    showHidden: boolean = false,
    sortField: FileSortField = "name",
    sortOrder: FileSortOrder = "asc"
) {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<DirectoryListResponse>({
        queryKey: ["fs-dir", host, path, showHidden, sortField, sortOrder],
        queryFn: () =>
            fetchAgent<DirectoryListResponse>(
                host,
                `/api/v1/fs/list?path=${encodeURIComponent(path)}&show_hidden=${showHidden}&sort_field=${sortField}&sort_order=${sortOrder}`
            ),
        staleTime: 5_000,
        refetchOnWindowFocus: false,
    });
}

export function useFileContent(path: string | null, maxBytes: number = 0, enabled: boolean = true) {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<FileContentResponse>({
        queryKey: ["fs-content", host, path, maxBytes],
        queryFn: () =>
            fetchAgent<FileContentResponse>(
                host,
                `/api/v1/fs/read?path=${encodeURIComponent(path || "")}${maxBytes > 0 ? `&max_bytes=${maxBytes}` : ""}`
            ),
        enabled: enabled && !!path,
        staleTime: 10_000,
    });
}

export function useFileStat(path: string | null, enabled: boolean = true) {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<FileSystemItem>({
        queryKey: ["fs-stat", host, path],
        queryFn: () =>
            fetchAgent<FileSystemItem>(
                host,
                `/api/v1/fs/stat?path=${encodeURIComponent(path || "")}`
            ),
        enabled: enabled && !!path,
        staleTime: 15_000,
    });
}

export function useFileSearch(
    path: string,
    query: string,
    isRegex: boolean = false,
    matchContent: boolean = false,
    enabled: boolean = true
) {
    const host = useHostStore((s) => s.selectedHost);
    const trimmed = query.trim();

    return useQuery<SearchResponse>({
        queryKey: ["fs-search", host, path, trimmed, isRegex, matchContent],
        queryFn: () =>
            fetchAgent<SearchResponse>(
                host,
                `/api/v1/fs/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(trimmed)}&regex=${isRegex}&content=${matchContent}&limit=50`
            ),
        enabled: enabled && trimmed.length >= 2,
        staleTime: 30_000,
    });
}

export function useFileGit(path: string, enabled: boolean = true) {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<GitInfo>({
        queryKey: ["fs-git", host, path],
        queryFn: () =>
            fetchAgent<GitInfo>(
                host,
                `/api/v1/fs/git?path=${encodeURIComponent(path)}`
            ),
        enabled: enabled && !!path,
        staleTime: 10_000,
    });
}

export function useFileMutations() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const invalidateFS = () => {
        queryClient.invalidateQueries({ queryKey: ["fs-dir", host] });
        queryClient.invalidateQueries({ queryKey: ["fs-content", host] });
        queryClient.invalidateQueries({ queryKey: ["fs-stat", host] });
    };

    const writeFile = useMutation({
        mutationFn: (payload: WriteFilePayload) =>
            postAgent<{ status: string; path: string }>(host, "/api/v1/fs/write", payload),
        onSuccess: invalidateFS,
    });

    const createDir = useMutation({
        mutationFn: (path: string) =>
            postAgent<{ status: string; path: string }>(host, "/api/v1/fs/mkdir", { path }),
        onSuccess: invalidateFS,
    });

    const deletePaths = useMutation({
        mutationFn: ({ paths, recursive }: { paths: string[]; recursive: boolean }) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/delete", { paths, recursive }),
        onSuccess: invalidateFS,
    });

    const renamePath = useMutation({
        mutationFn: ({ oldPath, newPath }: { oldPath: string; newPath: string }) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/rename", { old_path: oldPath, new_path: newPath }),
        onSuccess: invalidateFS,
    });

    const copyPath = useMutation({
        mutationFn: ({ srcPath, dstPath, overwrite }: { srcPath: string; dstPath: string; overwrite: boolean }) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/copy", { src_path: srcPath, dst_path: dstPath, overwrite }),
        onSuccess: invalidateFS,
    });

    const changePermissions = useMutation({
        mutationFn: (payload: ChmodPayload) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/chmod", payload),
        onSuccess: invalidateFS,
    });

    const createArchive = useMutation({
        mutationFn: (payload: ArchivePayload) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/archive", payload),
        onSuccess: invalidateFS,
    });

    const extractArchive = useMutation({
        mutationFn: (payload: ExtractPayload) =>
            postAgent<{ status: string }>(host, "/api/v1/fs/extract", payload),
        onSuccess: invalidateFS,
    });

    const uploadFiles = async (targetDir: string, files: File[]) => {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f, f.name));

        const url = `/api/agent/${encodeURIComponent(host)}/api/v1/fs/upload?path=${encodeURIComponent(targetDir)}`;
        const reqId = crypto.randomUUID();

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "X-Request-ID": reqId,
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
            throw err;
        }

        invalidateFS();
        return res.json();
    };

    return {
        writeFile,
        createDir,
        deletePaths,
        renamePath,
        copyPath,
        changePermissions,
        createArchive,
        extractArchive,
        uploadFiles,
        invalidateFS,
    };
}
