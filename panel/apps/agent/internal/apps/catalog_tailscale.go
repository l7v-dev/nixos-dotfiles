package apps

func init() {
	Register(Application{
		ID:          "tailscale",
		Name:        "Tailscale Mesh VPN",
		Description: "Zero-trust encrypted WireGuard mesh overlay network daemon for secure admin access",
		Category:    CategoryIngressNetwork,
		Status:      StatusStopped,
		AccessLevel: AccessTailscaleMesh,
		SystemdUnit: "tailscaled.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "tcp", URL: "tailscale0:41641", Port: 41641, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/infrastructure/security/default.nix",
			PackageName: "tailscale",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"vpn", "wireguard", "mesh", "zero-trust", "security"},
	})
}
