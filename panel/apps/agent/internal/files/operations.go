package files

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/user"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"syscall"
)

// cleanPath sanitizes and normalizes the target path.
func cleanPath(p string) string {
	if p == "" {
		return "/"
	}
	cleaned := filepath.Clean(p)
	if !filepath.IsAbs(cleaned) {
		cleaned = "/" + cleaned
	}
	return cleaned
}

// getOwnerGroup resolves UID and GID to usernames and group names.
func getOwnerGroup(stat *syscall.Stat_t) (string, string) {
	owner := strconv.FormatUint(uint64(stat.Uid), 10)
	group := strconv.FormatUint(uint64(stat.Gid), 10)

	if u, err := user.LookupId(owner); err == nil {
		owner = u.Username
	}
	if g, err := user.LookupGroupId(group); err == nil {
		group = g.Name
	}
	return owner, group
}

// buildFileInfo constructs FileInfo from os.FileInfo or os.DirEntry.
func buildFileInfo(path string, info os.FileInfo) FileInfo {
	name := info.Name()
	isDir := info.IsDir()
	size := info.Size()
	mode := info.Mode()
	modTime := info.ModTime()
	isSymlink := mode&os.ModeSymlink != 0
	symlinkTarget := ""

	if isSymlink {
		if target, err := os.Readlink(path); err == nil {
			symlinkTarget = target
		}
	}

	isHidden := strings.HasPrefix(name, ".") && name != "." && name != ".."

	var owner, group string
	if stat, ok := info.Sys().(*syscall.Stat_t); ok {
		owner, group = getOwnerGroup(stat)
	}

	ext := strings.ToLower(filepath.Ext(name))
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		if isDir {
			mimeType = "inode/directory"
		} else {
			mimeType = "application/octet-stream"
		}
	}

	octalPerm := fmt.Sprintf("%04o", mode.Perm())

	return FileInfo{
		Name:          name,
		Path:          path,
		Size:          size,
		Mode:          mode.String(),
		Permissions:   octalPerm,
		ModTime:       modTime,
		IsDir:         isDir,
		IsSymlink:     isSymlink,
		SymlinkTarget: symlinkTarget,
		IsHidden:      isHidden,
		Owner:         owner,
		Group:         group,
		MimeType:      mimeType,
		Extension:     ext,
	}
}

// ListDirectory lists files and folders inside path.
func (c *defaultFilesClient) ListDirectory(ctx context.Context, path string, showHidden bool, sortField string, sortOrder string) (*DirectoryListResponse, error) {
	cleaned := cleanPath(path)

	info, err := os.Stat(cleaned)
	if err != nil {
		return nil, fmt.Errorf("directory not found: %w", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path %q is not a directory", cleaned)
	}

	entries, err := os.ReadDir(cleaned)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var totalSize int64
	fileList := make([]FileInfo, 0, len(entries))

	for _, entry := range entries {
		name := entry.Name()
		if !showHidden && strings.HasPrefix(name, ".") {
			continue
		}

		fullPath := filepath.Join(cleaned, name)
		entryInfo, err := entry.Info()
		if err != nil {
			// Fallback for broken symlinks or permission denied entries
			fileList = append(fileList, FileInfo{
				Name:        name,
				Path:        fullPath,
				IsDir:       entry.IsDir(),
				IsHidden:    strings.HasPrefix(name, "."),
				MimeType:    "application/octet-stream",
				Permissions: "0000",
			})
			continue
		}

		fInfo := buildFileInfo(fullPath, entryInfo)
		if !fInfo.IsDir {
			totalSize += fInfo.Size
		}
		fileList = append(fileList, fInfo)
	}

	// Sort file list (folders first, then sorted by field)
	sort.SliceStable(fileList, func(i, j int) bool {
		if fileList[i].IsDir != fileList[j].IsDir {
			return fileList[i].IsDir // directories always first
		}

		asc := sortOrder != "desc"
		switch sortField {
		case "size":
			if asc {
				return fileList[i].Size < fileList[j].Size
			}
			return fileList[i].Size > fileList[j].Size
		case "modTime", "mod_time":
			if asc {
				return fileList[i].ModTime.Before(fileList[j].ModTime)
			}
			return fileList[i].ModTime.After(fileList[j].ModTime)
		case "type":
			if asc {
				return fileList[i].Extension < fileList[j].Extension
			}
			return fileList[i].Extension > fileList[j].Extension
		default: // "name"
			if asc {
				return strings.ToLower(fileList[i].Name) < strings.ToLower(fileList[j].Name)
			}
			return strings.ToLower(fileList[i].Name) > strings.ToLower(fileList[j].Name)
		}
	})

	parent := filepath.Dir(cleaned)
	if parent == cleaned {
		parent = ""
	}

	var freeSpace uint64
	var statfs syscall.Statfs_t
	if err := syscall.Statfs(cleaned, &statfs); err == nil {
		freeSpace = statfs.Bavail * uint64(statfs.Bsize)
	}

	gitInfo, _ := c.GetGitInfo(ctx, cleaned)

	return &DirectoryListResponse{
		Path:       cleaned,
		Parent:     parent,
		TotalItems: len(fileList),
		TotalSize:  totalSize,
		FreeSpace:  freeSpace,
		Files:      fileList,
		Git:        gitInfo,
	}, nil
}

// GetFileStat retrieves detailed metadata for a file or folder.
func (c *defaultFilesClient) GetFileStat(ctx context.Context, path string) (*FileInfo, error) {
	cleaned := cleanPath(path)

	info, err := os.Lstat(cleaned)
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}

	fInfo := buildFileInfo(cleaned, info)
	return &fInfo, nil
}

// ReadFileContent reads text or binary file up to maxBytes (default 10MB).
func (c *defaultFilesClient) ReadFileContent(ctx context.Context, path string, maxBytes int64) (*FileContentResponse, error) {
	cleaned := cleanPath(path)

	if maxBytes <= 0 || maxBytes > 50*1024*1024 {
		maxBytes = 10 * 1024 * 1024 // 10MB default
	}

	file, err := os.Open(cleaned)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return nil, fmt.Errorf("failed to stat file: %w", err)
	}
	if stat.IsDir() {
		return nil, fmt.Errorf("path %q is a directory, not a file", cleaned)
	}

	buf := make([]byte, maxBytes)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	data := buf[:n]

	// Determine MIME type & binary status
	ext := strings.ToLower(filepath.Ext(cleaned))
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		mimeType = http.DetectContentType(data)
	}

	isBinary := isBinaryData(data)
	var content string
	encoding := "utf-8"

	if isBinary {
		encoding = "base64"
		content = base64.StdEncoding.EncodeToString(data)
	} else {
		content = string(data)
	}

	octalPerm := fmt.Sprintf("%04o", stat.Mode().Perm())

	return &FileContentResponse{
		Path:        cleaned,
		Size:        stat.Size(),
		Content:     content,
		Encoding:    encoding,
		MimeType:    mimeType,
		IsBinary:    isBinary,
		ModTime:     stat.ModTime(),
		Permissions: octalPerm,
	}, nil
}

// isBinaryData checks for null bytes in initial chunk.
func isBinaryData(data []byte) bool {
	if len(data) == 0 {
		return false
	}
	checkLen := len(data)
	if checkLen > 1024 {
		checkLen = 1024
	}
	return bytes.IndexByte(data[:checkLen], 0) != -1
}

// WriteFileContent writes content to a file.
func (c *defaultFilesClient) WriteFileContent(ctx context.Context, req WriteFileRequest) error {
	cleaned := cleanPath(req.Path)

	if req.CreateParents {
		parent := filepath.Dir(cleaned)
		if err := os.MkdirAll(parent, 0755); err != nil {
			return fmt.Errorf("failed to create parent directories: %w", err)
		}
	}

	var data []byte
	if req.Encoding == "base64" {
		decoded, err := base64.StdEncoding.DecodeString(req.Content)
		if err != nil {
			return fmt.Errorf("failed to decode base64 content: %w", err)
		}
		data = decoded
	} else {
		data = []byte(req.Content)
	}

	perm := os.FileMode(0644)
	if req.Permissions != "" {
		if parsed, err := strconv.ParseUint(req.Permissions, 8, 32); err == nil {
			perm = os.FileMode(parsed)
		}
	}

	if err := os.WriteFile(cleaned, data, perm); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// CreateDirectory creates a new directory.
func (c *defaultFilesClient) CreateDirectory(ctx context.Context, path string) error {
	cleaned := cleanPath(path)
	if err := os.MkdirAll(cleaned, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}
	return nil
}

// DeletePaths removes files or folders.
func (c *defaultFilesClient) DeletePaths(ctx context.Context, req DeleteRequest) error {
	for _, p := range req.Paths {
		cleaned := cleanPath(p)
		if cleaned == "/" || cleaned == "/home" || cleaned == "/etc" || cleaned == "/nix" {
			return fmt.Errorf("refusing to delete protected root directory: %s", cleaned)
		}

		var err error
		if req.Recursive {
			err = os.RemoveAll(cleaned)
		} else {
			err = os.Remove(cleaned)
		}

		if err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete %q: %w", cleaned, err)
		}
	}
	return nil
}

// RenameOrMove renames or moves a path.
func (c *defaultFilesClient) RenameOrMove(ctx context.Context, req RenameRequest) error {
	oldCleaned := cleanPath(req.OldPath)
	newCleaned := cleanPath(req.NewPath)

	if oldCleaned == "/" || newCleaned == "/" {
		return fmt.Errorf("cannot rename root directory")
	}

	// If destination parent doesn't exist, create it
	dstParent := filepath.Dir(newCleaned)
	if err := os.MkdirAll(dstParent, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	if err := os.Rename(oldCleaned, newCleaned); err != nil {
		return fmt.Errorf("failed to rename/move: %w", err)
	}
	return nil
}

// CopyPath recursively copies files or directories.
func (c *defaultFilesClient) CopyPath(ctx context.Context, req CopyRequest) error {
	src := cleanPath(req.SrcPath)
	dst := cleanPath(req.DstPath)

	srcInfo, err := os.Lstat(src)
	if err != nil {
		return fmt.Errorf("source path not found: %w", err)
	}

	if !req.Overwrite {
		if _, err := os.Lstat(dst); err == nil {
			return fmt.Errorf("destination already exists: %s", dst)
		}
	}

	if srcInfo.IsDir() {
		return copyDir(src, dst)
	}
	return copyFile(src, dst, srcInfo.Mode())
}

func copyFile(src, dst string, mode os.FileMode) error {
	dstParent := filepath.Dir(dst)
	if err := os.MkdirAll(dstParent, 0755); err != nil {
		return err
	}

	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func copyDir(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dst, srcInfo.Mode()); err != nil {
		return err
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			info, err := entry.Info()
			if err != nil {
				continue
			}
			if err := copyFile(srcPath, dstPath, info.Mode()); err != nil {
				return err
			}
		}
	}
	return nil
}

// ChangePermissions modifies POSIX permissions and ownership.
func (c *defaultFilesClient) ChangePermissions(ctx context.Context, req ChmodRequest) error {
	cleaned := cleanPath(req.Path)

	if req.Mode != "" {
		parsed, err := strconv.ParseUint(req.Mode, 8, 32)
		if err != nil {
			return fmt.Errorf("invalid octal mode %q: %w", req.Mode, err)
		}
		mode := os.FileMode(parsed)

		if req.Recursive {
			err := filepath.Walk(cleaned, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}
				return os.Chmod(path, mode)
			})
			if err != nil {
				return fmt.Errorf("failed to recursively chmod: %w", err)
			}
		} else {
			if err := os.Chmod(cleaned, mode); err != nil {
				return fmt.Errorf("failed to chmod: %w", err)
			}
		}
	}

	return nil
}

// StreamDownload opens file for streaming download.
func (c *defaultFilesClient) StreamDownload(ctx context.Context, path string) (io.ReadCloser, string, int64, error) {
	cleaned := cleanPath(path)

	info, err := os.Stat(cleaned)
	if err != nil {
		return nil, "", 0, fmt.Errorf("file not found: %w", err)
	}

	if info.IsDir() {
		// Stream directory as tar.gz
		pr, pw := io.Pipe()
		go func() {
			err := streamTarGz(cleaned, pw)
			_ = pw.CloseWithError(err)
		}()
		filename := filepath.Base(cleaned) + ".tar.gz"
		return pr, filename, -1, nil
	}

	file, err := os.Open(cleaned)
	if err != nil {
		return nil, "", 0, fmt.Errorf("failed to open file: %w", err)
	}

	return file, info.Name(), info.Size(), nil
}
