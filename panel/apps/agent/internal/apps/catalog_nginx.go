package apps

func init() {
	Register(Application{
		ID:          "nginx",
		Name:        "Nginx Edge Reverse Proxy",
		Description: "High-performance edge ingress with automated ACME Let's Encrypt TLS termination",
		Category:    CategoryIngressNetwork,
		Status:      StatusStopped,
		AccessLevel: AccessPublicHTTPS,
		SystemdUnit: "nginx.service",
		SandboxTier: SandboxTierNone,
		Endpoints: []AppEndpoint{
			{Type: "https", URL: "https://0.0.0.0:443", Port: 443, AccessLevel: AccessPublicHTTPS, Internal: false},
			{Type: "http", URL: "http://0.0.0.0:80", Port: 80, AccessLevel: AccessPublicHTTPS, Internal: false},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/reverse-proxy/nginx.nix",
			PackageName: "nginx",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"ingress", "tls", "proxy", "acme", "gateway"},
	})
}
