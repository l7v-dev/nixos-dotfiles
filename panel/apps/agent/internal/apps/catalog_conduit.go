package apps

func init() {
	Register(Application{
		ID:          "conduit",
		Name:        "Conduit Matrix Homeserver",
		Description: "High-efficiency federated Matrix encrypted chat and operations alert homeserver",
		Category:    CategoryCorePlatform,
		Status:      StatusStopped,
		AccessLevel: AccessPublicHTTPS,
		SystemdUnit: "conduit.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "https", URL: "https://matrix.l7v.dev", Port: 6167, AccessLevel: AccessPublicHTTPS, Internal: false},
		},
		Dependencies: []string{"nginx.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/messaging/conduit.nix",
			PackageName: "matrix-conduit",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"matrix", "messaging", "chat", "federation"},
	})
}
