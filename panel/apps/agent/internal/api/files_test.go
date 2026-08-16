package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
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
