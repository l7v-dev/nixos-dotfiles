package files

import (
	"context"
	"io"
	"time"
)

// FileInfo represents metadata about a file or directory.
type FileInfo struct {
	Name          string    `json:"name"`
	Path          string    `json:"path"`
	Size          int64     `json:"size"`
	Mode          string    `json:"mode"`
	Permissions   string    `json:"permissions"` // e.g. "0755" or "-rwxr-xr-x"
	ModTime       time.Time `json:"mod_time"`
	IsDir         bool      `json:"is_dir"`
	IsSymlink     bool      `json:"is_symlink"`
	SymlinkTarget string    `json:"symlink_target,omitempty"`
	IsHidden      bool      `json:"is_hidden"`
	Owner         string    `json:"owner,omitempty"`
	Group         string    `json:"group,omitempty"`
	MimeType      string    `json:"mime_type,omitempty"`
	Extension     string    `json:"extension,omitempty"`
}

// GitInfo represents the Git repository status of a directory.
type GitInfo struct {
	IsRepo        bool   `json:"is_repo"`
	Branch        string `json:"branch,omitempty"`
	Commit        string `json:"commit,omitempty"`
	IsDirty       bool   `json:"is_dirty"`
	ModifiedCount int    `json:"modified_count"`
	UntrackedCount int   `json:"untracked_count"`
}

// DirectoryListResponse represents the contents of a directory.
type DirectoryListResponse struct {
	Path        string     `json:"path"`
	Parent      string     `json:"parent,omitempty"`
	TotalItems  int        `json:"total_items"`
	TotalSize   int64      `json:"total_size"`
	FreeSpace   uint64     `json:"free_space,omitempty"`
	Files       []FileInfo `json:"files"`
	Git         *GitInfo   `json:"git,omitempty"`
}

// FileContentResponse represents the content of a read file.
type FileContentResponse struct {
	Path        string    `json:"path"`
	Size        int64     `json:"size"`
	Content     string    `json:"content"`
	Encoding    string    `json:"encoding"` // "utf-8" or "base64"
	MimeType    string    `json:"mime_type"`
	IsBinary    bool      `json:"is_binary"`
	ModTime     time.Time `json:"mod_time"`
	Permissions string    `json:"permissions"`
}

// SearchMatch represents a file search hit.
type SearchMatch struct {
	Path       string `json:"path"`
	IsDir      bool   `json:"is_dir"`
	Size       int64  `json:"size"`
	LineNumber int    `json:"line_number,omitempty"`
	LineText   string `json:"line_text,omitempty"`
}

// WriteFileRequest payload for creating/updating a file.
type WriteFileRequest struct {
	Path          string `json:"path"`
	Content       string `json:"content"`
	Encoding      string `json:"encoding,omitempty"` // "utf-8" (default) or "base64"
	CreateParents bool   `json:"create_parents,omitempty"`
	Permissions   string `json:"permissions,omitempty"` // e.g. "0644"
}

// CreateDirRequest payload for creating a new directory.
type CreateDirRequest struct {
	Path string `json:"path"`
}

// DeleteRequest payload for deleting files/folders.
type DeleteRequest struct {
	Paths     []string `json:"paths"`
	Recursive bool     `json:"recursive"`
}

// RenameRequest payload for renaming/moving a path.
type RenameRequest struct {
	OldPath string `json:"old_path"`
	NewPath string `json:"new_path"`
}

// CopyRequest payload for copying files/folders.
type CopyRequest struct {
	SrcPath   string `json:"src_path"`
	DstPath   string `json:"dst_path"`
	Overwrite bool   `json:"overwrite"`
}

// ChmodRequest payload for changing POSIX permissions.
type ChmodRequest struct {
	Path      string `json:"path"`
	Mode      string `json:"mode"` // e.g. "0755" or "0644"
	Owner     string `json:"owner,omitempty"`
	Group     string `json:"group,omitempty"`
	Recursive bool   `json:"recursive,omitempty"`
}

// ArchiveRequest payload for compressing paths.
type ArchiveRequest struct {
	Paths       []string `json:"paths"`
	Destination string   `json:"destination"`
	Format      string   `json:"format"` // "tar.gz", "zip", "tar.zst"
}

// ExtractRequest payload for extracting an archive.
type ExtractRequest struct {
	ArchivePath string `json:"archive_path"`
	Destination string `json:"destination"`
}

// Client defines the interface for File Explorer operations.
type Client interface {
	ListDirectory(ctx context.Context, path string, showHidden bool, sortField string, sortOrder string) (*DirectoryListResponse, error)
	GetFileStat(ctx context.Context, path string) (*FileInfo, error)
	ReadFileContent(ctx context.Context, path string, maxBytes int64) (*FileContentResponse, error)
	WriteFileContent(ctx context.Context, req WriteFileRequest) error
	CreateDirectory(ctx context.Context, path string) error
	DeletePaths(ctx context.Context, req DeleteRequest) error
	RenameOrMove(ctx context.Context, req RenameRequest) error
	CopyPath(ctx context.Context, req CopyRequest) error
	ChangePermissions(ctx context.Context, req ChmodRequest) error
	CreateArchive(ctx context.Context, req ArchiveRequest) error
	ExtractArchive(ctx context.Context, req ExtractRequest) error
	SearchFiles(ctx context.Context, rootPath string, query string, isRegex bool, matchContent bool, maxDepth int, limit int) ([]SearchMatch, error)
	GetGitInfo(ctx context.Context, path string) (*GitInfo, error)
	StreamDownload(ctx context.Context, path string) (io.ReadCloser, string, int64, error)
}
