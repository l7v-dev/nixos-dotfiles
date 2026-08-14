package apps

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

const (
	DefaultManifestDir = "/etc/panel/services.d"
)

// LoadManifestsFromDir scans a directory for JSON/YAML background service manifests
// and returns the parsed Application descriptors.
func LoadManifestsFromDir(dirPath string) ([]Application, error) {
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		return nil, nil
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var discovered []Application
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if ext != ".json" && ext != ".yaml" && ext != ".yml" {
			continue
		}

		fullPath := filepath.Join(dirPath, entry.Name())
		data, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}

		var app Application
		if ext == ".json" {
			if err := json.Unmarshal(data, &app); err == nil && app.ID != "" {
				discovered = append(discovered, app)
			}
		}
	}

	return discovered, nil
}
