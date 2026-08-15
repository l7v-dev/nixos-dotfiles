package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/l7v/panel-agent/internal/packages"
)

type mockPackagesClient struct {
	searchPackagesFn func(ctx context.Context, params packages.PackageSearchParams) (*packages.SearchResponse[packages.PackageSearchResult], error)
	searchOptionsFn  func(ctx context.Context, params packages.OptionSearchParams) (*packages.SearchResponse[packages.OptionSearchResult], error)
	getPackageInfoFn func(ctx context.Context, attrName string, channel string) (*packages.PackageSearchResult, error)
	listInstalledFn  func(ctx context.Context) ([]packages.InstalledPackage, error)
	isInstalledFn    func(ctx context.Context, pname string) (bool, string)
}

func (m *mockPackagesClient) SearchPackages(ctx context.Context, params packages.PackageSearchParams) (*packages.SearchResponse[packages.PackageSearchResult], error) {
	if m.searchPackagesFn != nil {
		return m.searchPackagesFn(ctx, params)
	}
	return &packages.SearchResponse[packages.PackageSearchResult]{
		Query:   params.Query,
		Channel: params.Channel,
		Results: []packages.PackageSearchResult{
			{
				PackageAttrName: "ripgrep",
				PackagePName:    "ripgrep",
				PackagePVersion: "15.2.0",
				IsInstalled:     true,
			},
		},
	}, nil
}

func (m *mockPackagesClient) SearchOptions(ctx context.Context, params packages.OptionSearchParams) (*packages.SearchResponse[packages.OptionSearchResult], error) {
	if m.searchOptionsFn != nil {
		return m.searchOptionsFn(ctx, params)
	}
	return &packages.SearchResponse[packages.OptionSearchResult]{
		Query:   params.Query,
		Channel: params.Channel,
		Results: []packages.OptionSearchResult{
			{
				OptionName: "networking.firewall.enable",
				OptionType: "boolean",
			},
		},
	}, nil
}

func (m *mockPackagesClient) GetPackageInfo(ctx context.Context, attrName string, channel string) (*packages.PackageSearchResult, error) {
	if m.getPackageInfoFn != nil {
		return m.getPackageInfoFn(ctx, attrName, channel)
	}
	return &packages.PackageSearchResult{
		PackageAttrName: attrName,
		PackagePName:    attrName,
		PackagePVersion: "1.0.0",
	}, nil
}

func (m *mockPackagesClient) ListInstalledPackages(ctx context.Context) ([]packages.InstalledPackage, error) {
	if m.listInstalledFn != nil {
		return m.listInstalledFn(ctx)
	}
	return []packages.InstalledPackage{
		{
			PName:     "ripgrep",
			Version:   "15.2.0",
			StorePath: "/nix/store/test-ripgrep-15.2.0",
			Type:      "system",
		},
	}, nil
}

func (m *mockPackagesClient) IsPackageInstalled(ctx context.Context, pname string) (bool, string) {
	if m.isInstalledFn != nil {
		return m.isInstalledFn(ctx, pname)
	}
	return false, ""
}

func TestPackagesSearchEndpoint(t *testing.T) {
	deps := Deps{
		Packages: &mockPackagesClient{},
	}
	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/packages/search?q=ripgrep&channel=nixos-unstable", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp packages.SearchResponse[packages.PackageSearchResult]
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].PackageAttrName != "ripgrep" {
		t.Errorf("unexpected results: %+v", resp)
	}
}

func TestPackagesOptionsEndpoint(t *testing.T) {
	deps := Deps{
		Packages: &mockPackagesClient{},
	}
	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/packages/options?q=firewall", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp packages.SearchResponse[packages.OptionSearchResult]
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].OptionName != "networking.firewall.enable" {
		t.Errorf("unexpected results: %+v", resp)
	}
}

func TestPackagesInstalledEndpoint(t *testing.T) {
	deps := Deps{
		Packages: &mockPackagesClient{},
	}
	router := NewRouter(deps)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/packages/installed", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	var resp struct {
		Total    int                         `json:"total"`
		Packages []packages.InstalledPackage `json:"packages"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Total != 1 || resp.Packages[0].PName != "ripgrep" {
		t.Errorf("unexpected installed response: %+v", resp)
	}
}
