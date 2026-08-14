package apps

func init() {
	Register(Application{
		ID:          "forgejo",
		Name:        "Forgejo Git Platform",
		Description: "Self-hosted lightweight Git repository, code collaboration & CI/CD platform",
		Category:    CategoryCorePlatform,
		Status:      StatusStopped,
		AccessLevel: AccessPublicHTTPS,
		SystemdUnit: "forgejo.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "https", URL: "https://git.l7v.dev", Port: 3000, AccessLevel: AccessPublicHTTPS, Internal: false},
			{Type: "ssh", URL: "ssh://git@git.l7v.dev:22", Port: 22, AccessLevel: AccessPublicHTTPS, Internal: false},
		},
		Dependencies: []string{"postgresql.service", "nginx.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/services/forgejo/default.nix",
			PackageName: "forgejo",
			FlakeInput:  "nixpkgs",
			SecretKeys:  []string{"forgejo/admin_password"},
		},
		Tags: []string{"git", "vcs", "ci-cd", "core", "remote-dev"},
	})
}
