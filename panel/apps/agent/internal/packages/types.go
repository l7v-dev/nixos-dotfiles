package packages

import "context"

// PackageSearchResult represents a Nix package found via search.
type PackageSearchResult struct {
	PackageAttrName        string   `json:"package_attr_name"`
	PackageAttrSet         string   `json:"package_attr_set,omitempty"`
	PackagePName           string   `json:"package_pname"`
	PackagePVersion        string   `json:"package_pversion"`
	PackagePlatforms       []string `json:"package_platforms,omitempty"`
	PackageOutputs         []string `json:"package_outputs,omitempty"`
	PackageDefaultOutput   string   `json:"package_default_output,omitempty"`
	PackagePrograms        []string `json:"package_programs,omitempty"`
	PackageMainProgram     string   `json:"package_mainProgram,omitempty"`
	PackageLicenseSet      []string `json:"package_license_set,omitempty"`
	PackageDescription     string   `json:"package_description,omitempty"`
	PackageLongDescription string   `json:"package_longDescription,omitempty"`
	PackageHomepage        []string `json:"package_homepage,omitempty"`
	PackagePosition        string   `json:"package_position,omitempty"`
	PackageSystem          string   `json:"package_system,omitempty"`
	IsInstalled            bool     `json:"is_installed"`
	InstalledVersion       string   `json:"installed_version,omitempty"`
}

// OptionSearchResult represents a NixOS or Home Manager configuration option.
type OptionSearchResult struct {
	Type              string `json:"type"`
	OptionName        string `json:"option_name"`
	OptionDescription string `json:"option_description,omitempty"`
	OptionType        string `json:"option_type,omitempty"`
	OptionDefault     string `json:"option_default,omitempty"`
	OptionExample     string `json:"option_example,omitempty"`
	OptionSource      string `json:"option_source,omitempty"`
	OptionFlake       string `json:"option_flake,omitempty"`
	FlakeName         string `json:"flake_name,omitempty"`
	FlakeDescription  string `json:"flake_description,omitempty"`
	Scope             string `json:"scope,omitempty"`
}

// InstalledPackage represents a package currently in the NixOS system closure or profile.
type InstalledPackage struct {
	PName     string   `json:"pname"`
	Version   string   `json:"version"`
	StorePath string   `json:"store_path"`
	Type      string   `json:"type"` // "system", "user"
	Programs  []string `json:"programs,omitempty"`
}

// NHPackageSearchOutput represents raw JSON structure output by `nh search packages --json`.
type NHPackageSearchOutput struct {
	Query     string                `json:"query"`
	Channel   string                `json:"channel"`
	ElapsedMs int                   `json:"elapsed_ms"`
	Results   []PackageSearchResult `json:"results"`
}

// NHOptionSearchOutput represents raw JSON structure output by `nh search options --json`.
type NHOptionSearchOutput struct {
	Query     string               `json:"query"`
	Channel   string               `json:"channel"`
	Scope     string               `json:"scope"`
	ElapsedMs int                  `json:"elapsed_ms"`
	Results   []OptionSearchResult `json:"results"`
}

// SearchResponse is the standardized API response for package searches.
type SearchResponse[T any] struct {
	Query     string `json:"query"`
	Channel   string `json:"channel"`
	ElapsedMs int64  `json:"elapsed_ms"`
	Total     int    `json:"total"`
	Results   []T    `json:"results"`
}

// PackageSearchParams holds parameters for searching packages.
type PackageSearchParams struct {
	Query   string
	Channel string
	Limit   int
}

// OptionSearchParams holds parameters for searching options.
type OptionSearchParams struct {
	Query   string
	Channel string
	Scope   string // "all", "nixos", "home-manager"
	Limit   int
}

// Client defines the interface for Nix package & option operations.
type Client interface {
	SearchPackages(ctx context.Context, params PackageSearchParams) (*SearchResponse[PackageSearchResult], error)
	SearchOptions(ctx context.Context, params OptionSearchParams) (*SearchResponse[OptionSearchResult], error)
	GetPackageInfo(ctx context.Context, attrName string, channel string) (*PackageSearchResult, error)
	ListInstalledPackages(ctx context.Context) ([]InstalledPackage, error)
	IsPackageInstalled(ctx context.Context, pname string) (bool, string)
}
