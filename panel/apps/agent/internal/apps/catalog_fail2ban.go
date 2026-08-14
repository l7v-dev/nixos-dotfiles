package apps

func init() {
	Register(Application{
		ID:          "fail2ban",
		Name:        "Fail2ban Intrusion Defense",
		Description: "Automated host defense daemon scanning logs for malicious authentication failures and banning IPs",
		Category:    CategoryObservability,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "fail2ban.service",
		SandboxTier: SandboxTierNone,
		Dependencies: []string{"sshd.service"},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/infrastructure/security/default.nix",
			PackageName: "fail2ban",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"security", "firewall", "ips", "auth", "siem"},
	})
}
