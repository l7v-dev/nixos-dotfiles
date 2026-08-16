package files

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// CreateArchive compresses given paths to destination.
func (c *defaultFilesClient) CreateArchive(ctx context.Context, req ArchiveRequest) error {
	dest := cleanPath(req.Destination)
	if len(req.Paths) == 0 {
		return fmt.Errorf("no paths provided to archive")
	}

	destDir := filepath.Dir(dest)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	format := strings.ToLower(req.Format)
	if format == "" {
		if strings.HasSuffix(dest, ".zip") {
			format = "zip"
		} else {
			format = "tar.gz"
		}
	}

	if format == "zip" {
		return createZip(dest, req.Paths)
	}
	return createTarGz(dest, req.Paths)
}

// ExtractArchive extracts an archive into destination directory.
func (c *defaultFilesClient) ExtractArchive(ctx context.Context, req ExtractRequest) error {
	archivePath := cleanPath(req.ArchivePath)
	dest := cleanPath(req.Destination)

	if err := os.MkdirAll(dest, 0755); err != nil {
		return err
	}

	lower := strings.ToLower(archivePath)
	if strings.HasSuffix(lower, ".zip") {
		return extractZip(archivePath, dest)
	}

	// Use tar command for tar.gz, tar.xz, tar.zst, tar.bz2, etc.
	if _, err := exec.LookPath("tar"); err == nil {
		cmd := exec.CommandContext(ctx, "tar", "-xf", archivePath, "-C", dest)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("tar extract failed (%w): %s", err, string(out))
		}
		return nil
	}

	return extractTarGz(archivePath, dest)
}

func createTarGz(dest string, paths []string) error {
	outFile, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer outFile.Close()

	gw := gzip.NewWriter(outFile)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	for _, p := range paths {
		cleaned := cleanPath(p)
		baseDir := filepath.Dir(cleaned)

		err := filepath.Walk(cleaned, func(filePath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			relPath, err := filepath.Rel(baseDir, filePath)
			if err != nil {
				return err
			}

			var link string
			if info.Mode()&os.ModeSymlink != 0 {
				link, _ = os.Readlink(filePath)
			}

			header, err := tar.FileInfoHeader(info, link)
			if err != nil {
				return err
			}
			header.Name = relPath

			if err := tw.WriteHeader(header); err != nil {
				return err
			}

			if !info.IsDir() && info.Mode()&os.ModeSymlink == 0 {
				f, err := os.Open(filePath)
				if err != nil {
					return err
				}
				defer f.Close()
				if _, err := io.Copy(tw, f); err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func streamTarGz(dirPath string, w io.Writer) error {
	gw := gzip.NewWriter(w)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	baseDir := filepath.Dir(dirPath)
	return filepath.Walk(dirPath, func(filePath string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(baseDir, filePath)
		if err != nil {
			return err
		}

		var link string
		if info.Mode()&os.ModeSymlink != 0 {
			link, _ = os.Readlink(filePath)
		}

		header, err := tar.FileInfoHeader(info, link)
		if err != nil {
			return err
		}
		header.Name = relPath

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if !info.IsDir() && info.Mode()&os.ModeSymlink == 0 {
			f, err := os.Open(filePath)
			if err != nil {
				return err
			}
			defer f.Close()
			if _, err := io.Copy(tw, f); err != nil {
				return err
			}
		}
		return nil
	})
}

func createZip(dest string, paths []string) error {
	outFile, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer outFile.Close()

	zw := zip.NewWriter(outFile)
	defer zw.Close()

	for _, p := range paths {
		cleaned := cleanPath(p)
		baseDir := filepath.Dir(cleaned)

		err := filepath.Walk(cleaned, func(filePath string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			relPath, err := filepath.Rel(baseDir, filePath)
			if err != nil {
				return err
			}

			header, err := zip.FileInfoHeader(info)
			if err != nil {
				return err
			}
			header.Name = relPath
			if info.IsDir() {
				header.Name += "/"
			} else {
				header.Method = zip.Deflate
			}

			writer, err := zw.CreateHeader(header)
			if err != nil {
				return err
			}

			if !info.IsDir() {
				f, err := os.Open(filePath)
				if err != nil {
					return err
				}
				defer f.Close()
				if _, err := io.Copy(writer, f); err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func extractTarGz(archivePath, dest string) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer f.Close()

	gr, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		target := filepath.Join(dest, filepath.Clean(header.Name))
		if !strings.HasPrefix(target, filepath.Clean(dest)+string(filepath.Separator)) && target != dest {
			return fmt.Errorf("illegal file path in archive: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, header.FileInfo().Mode())
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tr); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		case tar.TypeSymlink:
			_ = os.Remove(target)
			if err := os.Symlink(header.Linkname, target); err != nil {
				return err
			}
		}
	}
	return nil
}

func extractZip(archivePath, dest string) error {
	zr, err := zip.OpenReader(archivePath)
	if err != nil {
		return err
	}
	defer zr.Close()

	for _, f := range zr.File {
		target := filepath.Join(dest, filepath.Clean(f.Name))
		if !strings.HasPrefix(target, filepath.Clean(dest)+string(filepath.Separator)) && target != dest {
			return fmt.Errorf("illegal file path in zip: %s", f.Name)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}

		outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
