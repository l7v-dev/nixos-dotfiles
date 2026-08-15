package packages

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	// Matches /nix/store/<hash>-<name>-<version>
	storePathRegex = regexp.MustCompile(`^/nix/store/[a-z0-9]{32}-(.+)-([0-9][a-zA-Z0-9_\.\-]*)`)
)

type installedScanner struct {
	mu           sync.RWMutex
	lastScan     time.Time
	installedMap map[string]InstalledPackage // Key: lowercase pname
	packagesList []InstalledPackage
}

func newInstalledScanner() *installedScanner {
	return &installedScanner{
		installedMap: make(map[string]InstalledPackage),
		packagesList: make([]InstalledPackage, 0),
	}
}

// scanInstalled scans current system and user profile binaries.
func (s *installedScanner) scan(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If scanned in the last 30 seconds, return cached list
	if time.Since(s.lastScan) < 30*time.Second && len(s.installedMap) > 0 {
		return nil
	}

	newMap := make(map[string]InstalledPackage)
	programsByStore := make(map[string][]string)

	// Scan directories where active packages are symlinked
	scanDirs := []struct {
		path    string
		pkgType string
	}{
		{"/run/current-system/sw/bin", "system"},
		{"/etc/profiles/per-user", "user"},
	}

	for _, entry := range scanDirs {
		if entry.pkgType == "system" {
			s.scanBinDir(entry.path, "system", newMap, programsByStore)
		} else {
			// Scan /etc/profiles/per-user/*/bin
			userEntries, err := os.ReadDir(entry.path)
			if err == nil {
				for _, userDir := range userEntries {
					if userDir.IsDir() {
						userBin := filepath.Join(entry.path, userDir.Name(), "bin")
						s.scanBinDir(userBin, "user", newMap, programsByStore)
					}
				}
			}
		}
	}

	// Update programs in packages
	list := make([]InstalledPackage, 0, len(newMap))
	for k, pkg := range newMap {
		if progs, ok := programsByStore[pkg.StorePath]; ok {
			pkg.Programs = progs
			newMap[k] = pkg
		}
		list = append(list, pkg)
	}

	s.installedMap = newMap
	s.packagesList = list
	s.lastScan = time.Now()

	return nil
}

func (s *installedScanner) scanBinDir(dir string, pkgType string, outMap map[string]InstalledPackage, programsByStore map[string][]string) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	for _, file := range files {
		binPath := filepath.Join(dir, file.Name())
		target, err := os.Readlink(binPath)
		if err != nil {
			continue
		}

		// Target could be relative or absolute into /nix/store/...
		absTarget := target
		if !filepath.IsAbs(absTarget) {
			absTarget = filepath.Clean(filepath.Join(dir, target))
		}

		matches := storePathRegex.FindStringSubmatch(absTarget)
		if len(matches) >= 3 {
			pname := matches[1]
			version := matches[2]

			// Extract store root path (e.g. /nix/store/<hash>-<pname>-<version>)
			parts := strings.Split(absTarget, "/")
			var storePath string
			if len(parts) >= 4 {
				storePath = "/" + filepath.Join(parts[1], parts[2], parts[3])
			} else {
				storePath = absTarget
			}

			key := strings.ToLower(pname)
			if _, exists := outMap[key]; !exists {
				outMap[key] = InstalledPackage{
					PName:     pname,
					Version:   version,
					StorePath: storePath,
					Type:      pkgType,
				}
			}

			programsByStore[storePath] = append(programsByStore[storePath], file.Name())
		}
	}
}

func (s *installedScanner) list(ctx context.Context) ([]InstalledPackage, error) {
	if err := s.scan(ctx); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]InstalledPackage, len(s.packagesList))
	copy(result, s.packagesList)
	return result, nil
}

func (s *installedScanner) isInstalled(ctx context.Context, pname string) (bool, string) {
	_ = s.scan(ctx)
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := strings.ToLower(pname)
	if pkg, ok := s.installedMap[key]; ok {
		return true, pkg.Version
	}

	// Try checking if pname contains subpackage (e.g. emacsPackages.ripgrep -> ripgrep)
	if idx := strings.LastIndex(pname, "."); idx != -1 {
		subKey := strings.ToLower(pname[idx+1:])
		if pkg, ok := s.installedMap[subKey]; ok {
			return true, pkg.Version
		}
	}

	return false, ""
}
