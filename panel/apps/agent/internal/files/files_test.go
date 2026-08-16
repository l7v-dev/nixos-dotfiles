package files

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestFilesystemLifecycle(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewClient()
	ctx := context.Background()

	// 1. Create directory
	subDir := filepath.Join(tmpDir, "nested", "folder")
	if err := client.CreateDirectory(ctx, subDir); err != nil {
		t.Fatalf("failed to create directory: %v", err)
	}

	// 2. Write file
	filePath := filepath.Join(subDir, "hello.txt")
	err := client.WriteFileContent(ctx, WriteFileRequest{
		Path:    filePath,
		Content: "Hello, NixOS!",
	})
	if err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	// 3. Read file
	resp, err := client.ReadFileContent(ctx, filePath, 0)
	if err != nil {
		t.Fatalf("failed to read file: %v", err)
	}
	if resp.Content != "Hello, NixOS!" || resp.IsBinary {
		t.Errorf("unexpected read content: %+v", resp)
	}

	// 4. List directory
	listResp, err := client.ListDirectory(ctx, subDir, true, "name", "asc")
	if err != nil {
		t.Fatalf("failed to list directory: %v", err)
	}
	if len(listResp.Files) != 1 || listResp.Files[0].Name != "hello.txt" {
		t.Errorf("unexpected list response: %+v", listResp)
	}

	// 5. Stat file
	stat, err := client.GetFileStat(ctx, filePath)
	if err != nil {
		t.Fatalf("failed to stat file: %v", err)
	}
	if stat.Size != 13 || stat.IsDir {
		t.Errorf("unexpected stat: %+v", stat)
	}

	// 6. Copy file
	copyDst := filepath.Join(subDir, "hello_copy.txt")
	err = client.CopyPath(ctx, CopyRequest{
		SrcPath: filePath,
		DstPath: copyDst,
	})
	if err != nil {
		t.Fatalf("failed to copy file: %v", err)
	}

	// 7. Rename/Move file
	renameDst := filepath.Join(subDir, "hello_renamed.txt")
	err = client.RenameOrMove(ctx, RenameRequest{
		OldPath: copyDst,
		NewPath: renameDst,
	})
	if err != nil {
		t.Fatalf("failed to rename file: %v", err)
	}

	// 8. Search file
	matches, err := client.SearchFiles(ctx, tmpDir, "renamed", false, false, 5, 10)
	if err != nil {
		t.Fatalf("failed to search files: %v", err)
	}
	if len(matches) != 1 {
		t.Errorf("expected 1 match, got %d", len(matches))
	}

	// 9. Delete files
	err = client.DeletePaths(ctx, DeleteRequest{
		Paths:     []string{filePath, renameDst},
		Recursive: false,
	})
	if err != nil {
		t.Fatalf("failed to delete files: %v", err)
	}

	if _, err := os.Stat(filePath); !os.IsNotExist(err) {
		t.Errorf("expected file to be deleted")
	}
}

func TestArchiveAndExtract(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewClient()
	ctx := context.Background()

	srcDir := filepath.Join(tmpDir, "source")
	_ = os.MkdirAll(srcDir, 0755)
	_ = os.WriteFile(filepath.Join(srcDir, "doc.txt"), []byte("test archive content"), 0644)

	archivePath := filepath.Join(tmpDir, "test.tar.gz")
	err := client.CreateArchive(ctx, ArchiveRequest{
		Paths:       []string{srcDir},
		Destination: archivePath,
		Format:      "tar.gz",
	})
	if err != nil {
		t.Fatalf("failed to create archive: %v", err)
	}

	extractDir := filepath.Join(tmpDir, "extracted")
	err = client.ExtractArchive(ctx, ExtractRequest{
		ArchivePath: archivePath,
		Destination: extractDir,
	})
	if err != nil {
		t.Fatalf("failed to extract archive: %v", err)
	}

	extractedFile := filepath.Join(extractDir, "source", "doc.txt")
	data, err := os.ReadFile(extractedFile)
	if err != nil || string(data) != "test archive content" {
		t.Fatalf("failed to verify extracted content (%v): %s", err, string(data))
	}
}
