package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/files"
)

type mockFilesClient struct {
	listDirFn    func(ctx context.Context, path string, showHidden bool, sortField string, sortOrder string) (*files.DirectoryListResponse, error)
	readFileFn   func(ctx context.Context, path string, maxBytes int64) (*files.FileContentResponse, error)
	writeFileFn  func(ctx context.Context, req files.WriteFileRequest) error
	createDirFn  func(ctx context.Context, path string) error
	deleteFn     func(ctx context.Context, req files.DeleteRequest) error
	renameFn     func(ctx context.Context, req files.RenameRequest) error
	copyFn       func(ctx context.Context, req files.CopyRequest) error
	chmodFn      func(ctx context.Context, req files.ChmodRequest) error
	archiveFn    func(ctx context.Context, req files.ArchiveRequest) error
	extractFn    func(ctx context.Context, req files.ExtractRequest) error
	searchFn     func(ctx context.Context, rootPath string, query string, isRegex bool, matchContent bool, maxDepth int, limit int) ([]files.SearchMatch, error)
	getGitInfoFn func(ctx context.Context, path string) (*files.GitInfo, error)
	streamDownFn func(ctx context.Context, path string) (io.ReadCloser, string, int64, error)
}

func (m *mockFilesClient) ListDirectory(ctx context.Context, path string, showHidden bool, sortField string, sortOrder string) (*files.DirectoryListResponse, error) {
	if m.listDirFn != nil {
		return m.listDirFn(ctx, path, showHidden, sortField, sortOrder)
	}
	return &files.DirectoryListResponse{
		Path:       path,
		TotalItems: 1,
		Files: []files.FileInfo{
			{
				Name:        "test.nix",
				Path:        "/home/l7v/test.nix",
				Size:        100,
				Permissions: "0644",
				ModTime:     time.Now(),
			},
		},
	}, nil
}

func (m *mockFilesClient) GetFileStat(ctx context.Context, path string) (*files.FileInfo, error) {
	return &files.FileInfo{
		Name: "test.nix",
		Path: path,
		Size: 100,
	}, nil
}

func (m *mockFilesClient) ReadFileContent(ctx context.Context, path string, maxBytes int64) (*files.FileContentResponse, error) {
	if m.readFileFn != nil {
		return m.readFileFn(ctx, path, maxBytes)
	}
	return &files.FileContentResponse{
		Path:     path,
		Size:     15,
		Content:  "{ pkgs, ... }: {}",
		Encoding: "utf-8",
		MimeType: "text/plain",
	}, nil
}

func (m *mockFilesClient) WriteFileContent(ctx context.Context, req files.WriteFileRequest) error {
	if m.writeFileFn != nil {
		return m.writeFileFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) CreateDirectory(ctx context.Context, path string) error {
	if m.createDirFn != nil {
		return m.createDirFn(ctx, path)
	}
	return nil
}

func (m *mockFilesClient) DeletePaths(ctx context.Context, req files.DeleteRequest) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) RenameOrMove(ctx context.Context, req files.RenameRequest) error {
	if m.renameFn != nil {
		return m.renameFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) CopyPath(ctx context.Context, req files.CopyRequest) error {
	if m.copyFn != nil {
		return m.copyFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) ChangePermissions(ctx context.Context, req files.ChmodRequest) error {
	if m.chmodFn != nil {
		return m.chmodFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) CreateArchive(ctx context.Context, req files.ArchiveRequest) error {
	if m.archiveFn != nil {
		return m.archiveFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) ExtractArchive(ctx context.Context, req files.ExtractRequest) error {
	if m.extractFn != nil {
		return m.extractFn(ctx, req)
	}
	return nil
}

func (m *mockFilesClient) SearchFiles(ctx context.Context, rootPath string, query string, isRegex bool, matchContent bool, maxDepth int, limit int) ([]files.SearchMatch, error) {
	if m.searchFn != nil {
		return m.searchFn(ctx, rootPath, query, isRegex, matchContent, maxDepth, limit)
	}
	return []files.SearchMatch{
		{Path: "/home/l7v/test.nix"},
	}, nil
}

func (m *mockFilesClient) GetGitInfo(ctx context.Context, path string) (*files.GitInfo, error) {
	if m.getGitInfoFn != nil {
		return m.getGitInfoFn(ctx, path)
	}
	return &files.GitInfo{IsRepo: true, Branch: "main"}, nil
}

func (m *mockFilesClient) StreamDownload(ctx context.Context, path string) (io.ReadCloser, string, int64, error) {
	if m.streamDownFn != nil {
		return m.streamDownFn(ctx, path)
	}
	return io.NopCloser(strings.NewReader("sample content")), "test.nix", 14, nil
}

func TestFilesListEndpoint(t *testing.T) {
	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/fs/list?path=/home/l7v", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp files.DirectoryListResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(resp.Files) != 1 || resp.Files[0].Name != "test.nix" {
		t.Errorf("unexpected list response: %+v", resp)
	}
}

func TestFilesReadEndpoint(t *testing.T) {
	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/fs/read?path=/home/l7v/test.nix", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp files.FileContentResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Content != "{ pkgs, ... }: {}" {
		t.Errorf("unexpected content: %s", resp.Content)
	}
}

func TestFilesWriteEndpoint(t *testing.T) {
	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	body, _ := json.Marshal(files.WriteFileRequest{
		Path:    "/home/l7v/new.nix",
		Content: "{ pkgs }: pkgs.hello",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/fs/write", bytes.NewReader(body))
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}
}

func createMultipartUploadRequest(t *testing.T, targetURL string, fileMap map[string]string) *http.Request {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	for filename, content := range fileMap {
		part, err := writer.CreateFormFile("files", filename)
		if err != nil {
			t.Fatalf("failed to create form file: %v", err)
		}
		if _, err := io.WriteString(part, content); err != nil {
			t.Fatalf("failed to write content: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, targetURL, body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

// Bug 3 — Upload Path Traversal
// Property 1: Bug Condition — Traversal Paths and Relative Paths Rejected With 400
// Validates: Requirements 1.7, 1.8, 2.8, 2.9, 2.10
func TestFsUpload_BugCondition_PathTraversalRejected(t *testing.T) {
	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	testCases := []struct {
		name string
		path string
	}{
		{name: "RelativeTraversal", path: "../../tmp/evil"},
		{name: "RelativeDirectory", path: "relative/dir"},
		{name: "DotDotInside", path: "/tmp/../../etc/cron.d"},
		{name: "SingleDot", path: "."},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req := createMultipartUploadRequest(t, "/api/v1/fs/upload?path="+tc.path, map[string]string{
				"payload.txt": "malicious content",
			})
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected 400 Bad Request for path %q, got %d (body: %s)",
					tc.path, w.Code, w.Body.String())
			}

			var resp map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to decode error json: %v", err)
			}
			if resp["message"] == "" {
				t.Fatalf("expected non-empty error message for path %q", tc.path)
			}
		})
	}
}

// Property 2: Preservation — Valid Absolute Upload Paths Succeed
// Validates: Requirements 3.8, 3.9
func TestFsUpload_Preservation_ValidUpload(t *testing.T) {
	tempDir := t.TempDir()

	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	req := createMultipartUploadRequest(t, "/api/v1/fs/upload?path="+tempDir, map[string]string{
		"config.nix": "{ config, ... }: {}",
	})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d (body: %s)", w.Code, w.Body.String())
	}

	var resp struct {
		Status   string   `json:"status"`
		Uploaded []string `json:"uploaded"`
		Total    int      `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "ok" || resp.Total != 1 || len(resp.Uploaded) != 1 {
		t.Fatalf("unexpected upload response: %+v", resp)
	}

	expectedPath := filepath.Join(tempDir, "config.nix")
	if resp.Uploaded[0] != expectedPath {
		t.Errorf("expected uploaded path %q, got %q", expectedPath, resp.Uploaded[0])
	}

	// Verify file was actually written to disk with correct content
	data, err := os.ReadFile(expectedPath)
	if err != nil {
		t.Fatalf("failed to read uploaded file: %v", err)
	}
	if string(data) != "{ config, ... }: {}" {
		t.Errorf("file content mismatch: got %q", string(data))
	}
}

// Property 2: Preservation — Multiple Files Uploaded in Single Form
func TestFsUpload_Preservation_MultipleFiles(t *testing.T) {
	tempDir := t.TempDir()

	deps := Deps{
		Files: &mockFilesClient{},
	}
	router := NewRouter(deps)

	filesMap := map[string]string{
		"file1.txt": "first file content",
		"file2.txt": "second file content",
		"file3.txt": "third file content",
	}

	req := createMultipartUploadRequest(t, "/api/v1/fs/upload?path="+tempDir, filesMap)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp struct {
		Status   string   `json:"status"`
		Uploaded []string `json:"uploaded"`
		Total    int      `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Total != 3 || len(resp.Uploaded) != 3 {
		t.Fatalf("expected 3 uploaded files, got total=%d, len=%d", resp.Total, len(resp.Uploaded))
	}

	for fname, content := range filesMap {
		path := filepath.Join(tempDir, fname)
		data, err := os.ReadFile(path)
		if err != nil {
			t.Errorf("failed to read %s: %v", path, err)
		}
		if string(data) != content {
			t.Errorf("content mismatch for %s: got %q, want %q", fname, string(data), content)
		}
	}
}
