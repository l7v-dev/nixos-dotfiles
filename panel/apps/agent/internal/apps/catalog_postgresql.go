package apps

func init() {
	Register(Application{
		ID:          "postgresql",
		Name:        "PostgreSQL Relational DB",
		Description: "Enterprise SQL database engine powering Forgejo, Vaultwarden, Matrix and Attic",
		Category:    CategoryDatabase,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "postgresql.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "unix", URL: "/run/postgresql", AccessLevel: AccessInternalOnly, Internal: true},
			{Type: "tcp", URL: "127.0.0.1:5432", Port: 5432, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/database/postgresql.nix",
			PackageName: "postgresql",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"database", "sql", "storage", "core", "persistence"},
	})
}
