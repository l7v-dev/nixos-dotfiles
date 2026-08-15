package packages

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestMemoryCache(t *testing.T) {
	cache := NewMemoryCache()

	cache.Set("foo", "bar", 50*time.Millisecond)

	val, ok := cache.Get("foo")
	if !ok || val.(string) != "bar" {
		t.Fatalf("expected bar, got %v (ok=%v)", val, ok)
	}

	time.Sleep(60 * time.Millisecond)

	_, ok = cache.Get("foo")
	if ok {
		t.Fatalf("expected key to be expired")
	}
}

func TestParseNHPackageSearchJSON(t *testing.T) {
	sampleJSON := `{
  "query": "ripgrep",
  "channel": "nixos-unstable",
  "elapsed_ms": 593,
  "results": [
    {
      "package_attr_name": "ripgrep",
      "package_attr_set": "No package set",
      "package_pname": "ripgrep",
      "package_pversion": "15.2.0",
      "package_platforms": ["x86_64-linux", "aarch64-linux"],
      "package_outputs": ["out"],
      "package_programs": ["rg"],
      "package_mainProgram": "rg",
      "package_license_set": ["MIT", "Unlicense"],
      "package_description": "Fast line-oriented search tool",
      "package_homepage": ["https://github.com/BurntSushi/ripgrep"],
      "package_position": "pkgs/by-name/ri/ripgrep/package.nix:66"
    }
  ]
}`

	var out NHPackageSearchOutput
	if err := json.Unmarshal([]byte(sampleJSON), &out); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if out.Query != "ripgrep" {
		t.Errorf("expected query ripgrep, got %s", out.Query)
	}

	if len(out.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(out.Results))
	}

	pkg := out.Results[0]
	if pkg.PackageAttrName != "ripgrep" || pkg.PackagePVersion != "15.2.0" {
		t.Errorf("unexpected pkg: %+v", pkg)
	}
	if pkg.PackageMainProgram != "rg" {
		t.Errorf("expected mainProgram rg, got %s", pkg.PackageMainProgram)
	}
}

func TestParseNHOptionSearchJSON(t *testing.T) {
	sampleJSON := `{
  "query": "networking.firewall",
  "channel": "nixos-unstable",
  "scope": "all",
  "elapsed_ms": 334,
  "results": [
    {
      "type": "option",
      "option_name": "networking.firewall.allowPing",
      "option_description": "<p>Whether to respond to ping.</p>",
      "option_type": "boolean",
      "option_default": "true",
      "option_source": "nixos/modules/services/networking/firewall.nix"
    },
    {
      "type": "option",
      "option_name": "programs.git.enable",
      "option_description": "<p>Enable git</p>",
      "option_type": "boolean",
      "option_default": "false",
      "option_source": "home-manager/modules/programs/git.nix"
    }
  ]
}`

	var out NHOptionSearchOutput
	if err := json.Unmarshal([]byte(sampleJSON), &out); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if len(out.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(out.Results))
	}

	if out.Results[0].OptionName != "networking.firewall.allowPing" {
		t.Errorf("unexpected opt: %+v", out.Results[0])
	}
}

func TestStorePathRegex(t *testing.T) {
	path1 := "/nix/store/7q0f1ys0q86z79i441p4d35272a8q71x-ripgrep-15.2.0/bin/rg"
	matches := storePathRegex.FindStringSubmatch(path1)
	if len(matches) < 3 {
		t.Fatalf("failed to match store path %s", path1)
	}
	if matches[1] != "ripgrep" {
		t.Errorf("expected pname ripgrep, got %s", matches[1])
	}
	if matches[2] != "15.2.0" {
		t.Errorf("expected version 15.2.0, got %s", matches[2])
	}

	path2 := "/nix/store/0k2f3p6h1m9a7v8b2c4d5e6f7g8h9i0j-docker-compose-2.29.1"
	matches2 := storePathRegex.FindStringSubmatch(path2)
	if len(matches2) < 3 {
		t.Fatalf("failed to match store path %s", path2)
	}
	if matches2[1] != "docker-compose" || matches2[2] != "2.29.1" {
		t.Errorf("expected docker-compose 2.29.1, got %s %s", matches2[1], matches2[2])
	}
}

func TestInstalledScannerMock(t *testing.T) {
	scanner := newInstalledScanner()
	pkg := InstalledPackage{
		PName:     "ripgrep",
		Version:   "15.2.0",
		StorePath: "/nix/store/test-ripgrep-15.2.0",
		Type:      "system",
		Programs:  []string{"rg"},
	}
	scanner.installedMap["ripgrep"] = pkg
	scanner.packagesList = []InstalledPackage{pkg}
	scanner.lastScan = time.Now()

	installed, ver := scanner.isInstalled(context.Background(), "ripgrep")
	if !installed || ver != "15.2.0" {
		t.Fatalf("expected installed ripgrep 15.2.0, got %v %s", installed, ver)
	}

	installed, _ = scanner.isInstalled(context.Background(), "emacsPackages.ripgrep")
	if !installed {
		t.Fatalf("expected sub-package lookup to find ripgrep")
	}

	installed, _ = scanner.isInstalled(context.Background(), "nonexistent-pkg")
	if installed {
		t.Fatalf("expected nonexistent-pkg to not be installed")
	}
}
