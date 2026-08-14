package apps

func init() {
	Register(Application{
		ID:          "promtail",
		Name:        "Promtail Journal Shipper",
		Description: "Local systemd journal tailing and log shipping daemon for Grafana Loki",
		Category:    CategoryObservability,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "promtail.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "http", URL: "http://127.0.0.1:9080", Port: 9080, AccessLevel: AccessInternalOnly, Internal: true},
		},
		Dependencies: []string{"loki.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/logging/promtail.nix",
			PackageName: "promtail",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"logging", "promtail", "journal", "loki", "shipper"},
	})
}
