export interface NixPackage {
    package_attr_name: string;
    package_attr_set?: string;
    package_pname: string;
    package_pversion: string;
    package_platforms?: string[];
    package_outputs?: string[];
    package_default_output?: string;
    package_programs?: string[];
    package_mainProgram?: string;
    package_license_set?: string[];
    package_description?: string;
    package_longDescription?: string;
    package_homepage?: string[];
    package_position?: string;
    package_system?: string;
    is_installed: boolean;
    installed_version?: string;
}

export interface NixOption {
    type?: string;
    option_name: string;
    option_description?: string;
    option_type?: string;
    option_default?: string;
    option_example?: string;
    option_source?: string;
    option_flake?: string;
    flake_name?: string;
    flake_description?: string;
    scope?: string;
}

export interface InstalledPackage {
    pname: string;
    version: string;
    store_path: string;
    type: "system" | "user";
    programs?: string[];
}

export interface PackageSearchResponse {
    query: string;
    channel: string;
    elapsed_ms: number;
    total: number;
    results: NixPackage[];
}

export interface OptionSearchResponse {
    query: string;
    channel: string;
    elapsed_ms: number;
    total: number;
    results: NixOption[];
}

export interface InstalledPackagesResponse {
    total: number;
    packages: InstalledPackage[];
}

export type SearchTab = "packages" | "options" | "installed";
export type OptionScope = "all" | "nixos" | "home-manager";
export type ChannelOption = "nixos-unstable" | "nixos-25.05" | "nixos-24.11";
