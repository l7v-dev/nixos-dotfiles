package apps

func init() {
	Register(Application{
		ID:          "panel-agent",
		Name:        "L7V Panel Control Agent",
		Description: "Systemd socket-activated D-Bus REST/SSE control plane and management daemon",
		Category:    CategoryCorePlatform,
		Status:      StatusRunning,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "panel-agent.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "unix", URL: "/run/panel-agent/panel-agent.sock", AccessLevel: AccessInternalOnly, Internal: true},
			{Type: "http", URL: "http://127.0.0.1:8080", Port: 8080, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "panel/nix/module.nix",
			PackageName: "panel-agent",
			FlakeInput:  "local",
		},
		Tags: []string{"panel", "control-plane", "agent", "api"},
	})
}
