package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/l7v/panel-agent/internal/files"
)

// fsListHandler handles GET /api/v1/fs/list?path=...&show_hidden=...&sort_field=...&sort_order=...
func fsListHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			path = os.Getenv("HOME")
			if path == "" {
				path = "/"
			}
		}

		showHidden := r.URL.Query().Get("show_hidden") == "true" || r.URL.Query().Get("show_hidden") == "1"
		sortField := r.URL.Query().Get("sort_field")
		sortOrder := r.URL.Query().Get("sort_order")

		resp, err := d.Files.ListDirectory(r.Context(), path, showHidden, sortField, sortOrder)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// fsStatHandler handles GET /api/v1/fs/stat?path=...
func fsStatHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "parameter 'path' is required"})
			return
		}

		stat, err := d.Files.GetFileStat(r.Context(), path)
		if err != nil {
			writeError(w, http.StatusNotFound, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, stat)
	}
}

// fsReadHandler handles GET /api/v1/fs/read?path=...&max_bytes=...
func fsReadHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "parameter 'path' is required"})
			return
		}

		var maxBytes int64
		if mbStr := r.URL.Query().Get("max_bytes"); mbStr != "" {
			if parsed, err := strconv.ParseInt(mbStr, 10, 64); err == nil {
				maxBytes = parsed
			}
		}

		resp, err := d.Files.ReadFileContent(r.Context(), path, maxBytes)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

// fsWriteHandler handles POST /api/v1/fs/write
func fsWriteHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.WriteFileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "invalid request body: " + err.Error()})
			return
		}

		if req.Path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "field 'path' is required"})
			return
		}

		if err := d.Files.WriteFileContent(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "path": req.Path})
	}
}

// fsUploadHandler handles POST /api/v1/fs/upload (multipart)
func fsUploadHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		// 100MB max memory
		if err := r.ParseMultipartForm(100 << 20); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "failed to parse multipart form: " + err.Error()})
			return
		}

		rawTarget := r.URL.Query().Get("path")
		if rawTarget == "" {
			rawTarget = r.FormValue("path")
		}
		if rawTarget == "" {
			rawTarget = "/"
		}

		if strings.Contains(rawTarget, "..") {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "upload path must not contain '..' components"})
			return
		}

		// Reject path traversal and relative paths.
		targetDir := filepath.Clean(filepath.FromSlash(rawTarget))
		if !filepath.IsAbs(targetDir) {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "upload path must be an absolute path"})
			return
		}
		if strings.Contains(targetDir, "..") {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "upload path must not contain '..' components"})
			return
		}

		form := r.MultipartForm
		if form == nil || form.File == nil {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "no files uploaded"})
			return
		}

		uploadedFiles := make([]string, 0)
		for _, fileHeaders := range form.File {
			for _, fileHeader := range fileHeaders {
				file, err := fileHeader.Open()
				if err != nil {
					continue
				}

				dstPath := filepath.Join(targetDir, filepath.Clean(fileHeader.Filename))
				if err := os.MkdirAll(filepath.Dir(dstPath), 0755); err != nil {
					file.Close()
					continue
				}

				outFile, err := os.OpenFile(dstPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
				if err != nil {
					file.Close()
					continue
				}

				_, copyErr := io.Copy(outFile, file)
				file.Close()
				outFile.Close()

				if copyErr == nil {
					uploadedFiles = append(uploadedFiles, dstPath)
				}
			}
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"status":   "ok",
			"uploaded": uploadedFiles,
			"total":    len(uploadedFiles),
		})
	}
}

// fsMkdirHandler handles POST /api/v1/fs/mkdir
func fsMkdirHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.CreateDirRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "valid 'path' is required"})
			return
		}

		if err := d.Files.CreateDirectory(r.Context(), req.Path); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "path": req.Path})
	}
}

// fsDeleteHandler handles POST /api/v1/fs/delete
func fsDeleteHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.DeleteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Paths) == 0 {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'paths' array is required"})
			return
		}

		if err := d.Files.DeletePaths(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "deleted": req.Paths})
	}
}

// fsRenameHandler handles POST /api/v1/fs/rename
func fsRenameHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.RenameRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OldPath == "" || req.NewPath == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'old_path' and 'new_path' are required"})
			return
		}

		if err := d.Files.RenameOrMove(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "old_path": req.OldPath, "new_path": req.NewPath})
	}
}

// fsCopyHandler handles POST /api/v1/fs/copy
func fsCopyHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.CopyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SrcPath == "" || req.DstPath == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'src_path' and 'dst_path' are required"})
			return
		}

		if err := d.Files.CopyPath(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "src_path": req.SrcPath, "dst_path": req.DstPath})
	}
}

// fsChmodHandler handles POST /api/v1/fs/chmod
func fsChmodHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.ChmodRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'path' is required"})
			return
		}

		if err := d.Files.ChangePermissions(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "path": req.Path})
	}
}

// fsArchiveHandler handles POST /api/v1/fs/archive
func fsArchiveHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.ArchiveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Paths) == 0 || req.Destination == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'paths' and 'destination' are required"})
			return
		}

		if err := d.Files.CreateArchive(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "destination": req.Destination})
	}
}

// fsExtractHandler handles POST /api/v1/fs/extract
func fsExtractHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		var req files.ExtractRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ArchivePath == "" || req.Destination == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "'archive_path' and 'destination' are required"})
			return
		}

		if err := d.Files.ExtractArchive(r.Context(), req); err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "destination": req.Destination})
	}
}

// fsSearchHandler handles GET /api/v1/fs/search?path=...&q=...&regex=...&content=...&max_depth=...&limit=...
func fsSearchHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			path = "/"
		}
		q := r.URL.Query().Get("q")
		if q == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "parameter 'q' is required"})
			return
		}

		isRegex := r.URL.Query().Get("regex") == "true" || r.URL.Query().Get("regex") == "1"
		matchContent := r.URL.Query().Get("content") == "true" || r.URL.Query().Get("content") == "1"

		maxDepth := 8
		if dStr := r.URL.Query().Get("max_depth"); dStr != "" {
			if parsed, err := strconv.Atoi(dStr); err == nil && parsed > 0 {
				maxDepth = parsed
			}
		}

		limit := 50
		if lStr := r.URL.Query().Get("limit"); lStr != "" {
			if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
				limit = parsed
			}
		}

		matches, err := d.Files.SearchFiles(r.Context(), path, q, isRegex, matchContent, maxDepth, limit)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"total":   len(matches),
			"matches": matches,
		})
	}
}

// fsGitHandler handles GET /api/v1/fs/git?path=...
func fsGitHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			path = "/"
		}

		info, err := d.Files.GetGitInfo(r.Context(), path)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}

		if info == nil {
			writeJSON(w, http.StatusOK, map[string]bool{"is_repo": false})
			return
		}

		writeJSON(w, http.StatusOK, info)
	}
}

// fsDownloadHandler handles GET /api/v1/fs/download?path=...
func fsDownloadHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if d.Files == nil {
			writeError(w, http.StatusNotImplemented, map[string]string{"message": "files engine not configured"})
			return
		}

		path := r.URL.Query().Get("path")
		if path == "" {
			writeError(w, http.StatusBadRequest, map[string]string{"message": "parameter 'path' is required"})
			return
		}

		rc, filename, size, err := d.Files.StreamDownload(r.Context(), path)
		if err != nil {
			writeError(w, http.StatusInternalServerError, map[string]string{"message": err.Error()})
			return
		}
		defer rc.Close()

		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
		w.Header().Set("Content-Type", "application/octet-stream")
		if size > 0 {
			w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
		}

		_, _ = io.Copy(w, rc)
	}
}
