package packages

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type defaultClient struct {
	cache     *MemoryCache
	installed *installedScanner
}

// NewClient returns a new packages Client.
func NewClient() Client {
	return &defaultClient{
		cache:     NewMemoryCache(),
		installed: newInstalledScanner(),
	}
}

// SearchPackages searches Nixpkgs packages via `nh search packages --json`.
func (c *defaultClient) SearchPackages(ctx context.Context, params PackageSearchParams) (*SearchResponse[PackageSearchResult], error) {
	query := strings.TrimSpace(params.Query)
	if query == "" {
		return &SearchResponse[PackageSearchResult]{
			Query:   "",
			Channel: params.Channel,
			Results: []PackageSearchResult{},
		}, nil
	}

	channel := params.Channel
	if channel == "" {
		channel = "nixos-unstable"
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 30
	} else if limit > 100 {
		limit = 100
	}

	cacheKey := fmt.Sprintf("pkg:%s:%s:%d", channel, query, limit)
	if cached, ok := c.cache.Get(cacheKey); ok {
		if res, ok := cached.(*SearchResponse[PackageSearchResult]); ok {
			// Update installed status in cached results
			for i := range res.Results {
				installed, ver := c.installed.isInstalled(ctx, res.Results[i].PackagePName)
				if !installed {
					installed, ver = c.installed.isInstalled(ctx, res.Results[i].PackageAttrName)
				}
				res.Results[i].IsInstalled = installed
				res.Results[i].InstalledVersion = ver
			}
			return res, nil
		}
	}

	start := time.Now()

	// Execute `nh search packages <query> --json --channel <channel> --limit <limit>`
	cmdArgs := []string{
		"search", "packages", query,
		"--json",
		"--channel", channel,
		"--limit", strconv.Itoa(limit),
	}

	cmd := exec.CommandContext(ctx, "nh", cmdArgs...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		return nil, fmt.Errorf("nh search failed (%w): %s", err, stderr.String())
	}

	var raw NHPackageSearchOutput
	if err := json.Unmarshal(stdout.Bytes(), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse nh search output: %w", err)
	}

	// Enrich with installed status
	for i := range raw.Results {
		installed, ver := c.installed.isInstalled(ctx, raw.Results[i].PackagePName)
		if !installed {
			installed, ver = c.installed.isInstalled(ctx, raw.Results[i].PackageAttrName)
		}
		raw.Results[i].IsInstalled = installed
		raw.Results[i].InstalledVersion = ver
	}

	response := &SearchResponse[PackageSearchResult]{
		Query:     query,
		Channel:   channel,
		ElapsedMs: elapsed,
		Total:     len(raw.Results),
		Results:   raw.Results,
	}

	c.cache.Set(cacheKey, response, 5*time.Minute)
	return response, nil
}

// SearchOptions searches NixOS & Home-Manager configuration options via `nh search options --json`.
func (c *defaultClient) SearchOptions(ctx context.Context, params OptionSearchParams) (*SearchResponse[OptionSearchResult], error) {
	query := strings.TrimSpace(params.Query)
	if query == "" {
		return &SearchResponse[OptionSearchResult]{
			Query:   "",
			Channel: params.Channel,
			Results: []OptionSearchResult{},
		}, nil
	}

	channel := params.Channel
	if channel == "" {
		channel = "nixos-unstable"
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 30
	} else if limit > 100 {
		limit = 100
	}

	scope := params.Scope
	if scope == "" {
		scope = "all"
	}

	cacheKey := fmt.Sprintf("opt:%s:%s:%s:%d", channel, scope, query, limit)
	if cached, ok := c.cache.Get(cacheKey); ok {
		if res, ok := cached.(*SearchResponse[OptionSearchResult]); ok {
			return res, nil
		}
	}

	start := time.Now()

	// Execute `nh search options <query> --json --channel <channel> --limit <limit>`
	cmdArgs := []string{
		"search", "options", query,
		"--json",
		"--channel", channel,
		"--limit", strconv.Itoa(limit),
	}

	cmd := exec.CommandContext(ctx, "nh", cmdArgs...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		return nil, fmt.Errorf("nh options search failed (%w): %s", err, stderr.String())
	}

	var raw NHOptionSearchOutput
	if err := json.Unmarshal(stdout.Bytes(), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse nh search options output: %w", err)
	}

	// Filter by scope if requested ("nixos" vs "home-manager")
	var filtered []OptionSearchResult
	if scope == "all" {
		filtered = raw.Results
	} else {
		filtered = make([]OptionSearchResult, 0, len(raw.Results))
		for _, opt := range raw.Results {
			isHM := strings.HasPrefix(opt.OptionSource, "home-manager") || strings.Contains(opt.OptionSource, "home-manager")
			if scope == "home-manager" && isHM {
				filtered = append(filtered, opt)
			} else if scope == "nixos" && !isHM {
				filtered = append(filtered, opt)
			}
		}
	}

	response := &SearchResponse[OptionSearchResult]{
		Query:     query,
		Channel:   channel,
		ElapsedMs: elapsed,
		Total:     len(filtered),
		Results:   filtered,
	}

	c.cache.Set(cacheKey, response, 5*time.Minute)
	return response, nil
}

// GetPackageInfo fetches single package details.
func (c *defaultClient) GetPackageInfo(ctx context.Context, attrName string, channel string) (*PackageSearchResult, error) {
	resp, err := c.SearchPackages(ctx, PackageSearchParams{
		Query:   attrName,
		Channel: channel,
		Limit:   10,
	})
	if err != nil {
		return nil, err
	}

	for _, p := range resp.Results {
		if p.PackageAttrName == attrName || p.PackagePName == attrName {
			return &p, nil
		}
	}

	if len(resp.Results) > 0 {
		return &resp.Results[0], nil
	}

	return nil, fmt.Errorf("package %q not found", attrName)
}

// ListInstalledPackages returns currently installed packages on host.
func (c *defaultClient) ListInstalledPackages(ctx context.Context) ([]InstalledPackage, error) {
	return c.installed.list(ctx)
}

// IsPackageInstalled checks if a package is installed.
func (c *defaultClient) IsPackageInstalled(ctx context.Context, pname string) (bool, string) {
	return c.installed.isInstalled(ctx, pname)
}
