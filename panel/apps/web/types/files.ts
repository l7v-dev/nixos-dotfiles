export interface FileSystemItem {
    name: string;
    path: string;
    size: number;
    mode: string;
    permissions: string; // e.g. "0755"
    mod_time: string;
    is_dir: boolean;
    is_symlink: boolean;
    symlink_target?: string;
    is_hidden: boolean;
    owner?: string;
    group?: string;
    mime_type?: string;
    extension?: string;
}

export interface GitInfo {
    is_repo: boolean;
    branch?: string;
    commit?: string;
    is_dirty: boolean;
    modified_count: number;
    untracked_count: number;
}

export interface DirectoryListResponse {
    path: string;
    parent?: string;
    total_items: number;
    total_size: number;
    free_space?: number;
    files: FileSystemItem[];
    git?: GitInfo;
}

export interface FileContentResponse {
    path: string;
    size: number;
    content: string;
    encoding: "utf-8" | "base64";
    mime_type: string;
    is_binary: boolean;
    mod_time: string;
    permissions: string;
}

export interface SearchMatch {
    path: string;
    is_dir: boolean;
    size: number;
    line_number?: number;
    line_text?: string;
}

export interface SearchResponse {
    total: number;
    matches: SearchMatch[];
}

export interface WriteFilePayload {
    path: string;
    content: string;
    encoding?: "utf-8" | "base64";
    create_parents?: boolean;
    permissions?: string;
}

export interface ChmodPayload {
    path: string;
    mode: string;
    owner?: string;
    group?: string;
    recursive?: boolean;
}

export interface ArchivePayload {
    paths: string[];
    destination: string;
    format: "tar.gz" | "zip" | "tar.zst";
}

export interface ExtractPayload {
    archive_path: string;
    destination: string;
}

export interface FileBookmark {
    id: string;
    name: string;
    path: string;
    icon?: string;
}

export type FileViewMode = "grid" | "table";
export type FileSortField = "name" | "size" | "modTime" | "type";
export type FileSortOrder = "asc" | "desc";
