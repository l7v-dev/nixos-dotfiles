package apps

func init() {
	Register(Application{
		ID:          "prometheus",
		Name:        "Prometheus Time-Series Engine",
		Description: "Service health monitoring and metric scraping engine with Prometheus QL",
		Category:    CategoryObservability,
		Status:      StatusStopped,
		AccessLevel: AccessTailscaleMesh,
		SystemdUnit: "prometheus.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "http", URL: "http://127.0.0.1:9090", Port: 9090, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/metrics/prometheus.nix",
			PackageName: "prometheus",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"metrics", "scraper", "telemetry", "alerts"},
	})
}
