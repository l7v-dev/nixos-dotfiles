package apps

func init() {
	Register(Application{
		ID:          "vaultwarden",
		Name:        "Vaultwarden Secrets Manager",
		Description: "Enterprise Bitwarden-compatible password, API key & credential vault",
		Category:    CategoryCorePlatform,
		Status:      StatusStopped,
		AccessLevel: AccessPublicHTTPS,
		SystemdUnit: "vaultwarden.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "https", URL: "https://vault.l7v.dev", Port: 8222, AccessLevel: AccessPublicHTTPS, Internal: false},
		},
		Dependencies: []string{"postgresql.service", "nginx.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/services/vaultwarden/default.nix",
			PackageName: "vaultwarden",
			FlakeInput:  "nixpkgs",
			SecretKeys:  []string{"vaultwarden/env"},
		},
		Tags: []string{"security", "passwords", "sops", "vault", "core"},
	})
}
