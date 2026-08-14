package apps

func init() {
	Register(Application{
		ID:          "loki",
		Name:        "Loki Log Aggregator",
		Description: "High-efficiency multi-tenant log indexing system for systemd journal and apps",
		Category:    CategoryObservability,
		Status:      StatusStopped,
		AccessLevel: AccessTailscaleMesh,
		SystemdUnit: "loki.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "http", URL: "http://127.0.0.1:3100", Port: 3100, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/logging/loki.nix",
			PackageName: "loki",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"logging", "promtail", "telemetry", "siem"},
	})
}
