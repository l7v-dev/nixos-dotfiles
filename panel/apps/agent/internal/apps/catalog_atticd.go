package apps

func init() {
	Register(Application{
		ID:          "atticd",
		Name:        "Attic Nix Binary Cache",
		Description: "Multi-tenant Nix binary cache server for instant deployment and build artifacts",
		Category:    CategoryCorePlatform,
		Status:      StatusStopped,
		AccessLevel: AccessPublicHTTPS,
		SystemdUnit: "atticd.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "https", URL: "https://cache.l7v.dev", Port: 8080, AccessLevel: AccessPublicHTTPS, Internal: false},
		},
		Dependencies: []string{"postgresql.service", "nginx.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/services/attic/default.nix",
			PackageName: "attic-server",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"nix", "cache", "builds", "ci-cd"},
	})
}
