"use client";

import React from "react";
import {
    Folder,
    FileText,
    FileCode,
    FileCode2,
    FileImage,
    FileAudio,
    FileVideo,
    FileArchive,
    FileSpreadsheet,
    FileCog,
    File,
    Binary,
    Terminal,
    Settings,
    Shield,
    Layers,
} from "lucide-react";
import type { FileSystemItem } from "@/types/files";

export function getFileIcon(item: FileSystemItem, size: "sm" | "md" | "lg" = "md") {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-10 h-10",
    };
    const cls = sizeClasses[size];

    if (item.is_dir) {
        if (item.name === ".git") return <Folder className={`${cls} text-amber-400`} />;
        if (item.name === "node_modules") return <Folder className={`${cls} text-emerald-500`} />;
        return <Folder className={`${cls} text-sky-400 fill-sky-400/20`} />;
    }

    const ext = (item.extension || "").toLowerCase();
    const name = item.name.toLowerCase();

    // Nix specific
    if (ext === ".nix" || name === "flake.lock") {
        return <Layers className={`${cls} text-cyan-400`} />;
    }

    // Code & Script
    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        return <FileCode2 className={`${cls} text-blue-400`} />;
    }
    if ([".go"].includes(ext)) {
        return <FileCode className={`${cls} text-cyan-400`} />;
    }
    if ([".rs"].includes(ext)) {
        return <FileCode className={`${cls} text-orange-400`} />;
    }
    if ([".py"].includes(ext)) {
        return <FileCode className={`${cls} text-yellow-400`} />;
    }
    if ([".sh", ".bash", ".zsh"].includes(ext)) {
        return <Terminal className={`${cls} text-emerald-400`} />;
    }

    // Configs & Data
    if ([".json", ".yaml", ".yml", ".toml", ".ini", ".conf"].includes(ext)) {
        return <FileCog className={`${cls} text-amber-400`} />;
    }
    if (ext === ".md" || ext === ".txt" || ext === ".org") {
        return <FileText className={`${cls} text-zinc-300`} />;
    }

    // Images
    if ([".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif", ".ico"].includes(ext)) {
        return <FileImage className={`${cls} text-purple-400`} />;
    }

    // Audio & Video
    if ([".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a"].includes(ext)) {
        return <FileAudio className={`${cls} text-pink-400`} />;
    }
    if ([".mp4", ".webm", ".mkv", ".mov", ".avi"].includes(ext)) {
        return <FileVideo className={`${cls} text-rose-400`} />;
    }

    // Archives
    if ([".tar", ".gz", ".tgz", ".zip", ".zst", ".xz", ".bz2", ".7z"].includes(ext) || name.endsWith(".tar.gz")) {
        return <FileArchive className={`${cls} text-amber-500`} />;
    }

    // Keys / Security
    if ([".age", ".key", ".pub", ".pem", ".crt"].includes(ext)) {
        return <Shield className={`${cls} text-red-400`} />;
    }

    // Executables / Binaries
    if (item.permissions.includes("7") || item.permissions.includes("5") || ext === ".so" || ext === "") {
        return <Binary className={`${cls} text-emerald-400`} />;
    }

    return <File className={`${cls} text-zinc-400`} />;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
