package apps

func init() {
	Register(Application{
		ID:          "microvm-coding-agent",
		Name:        "MicroVM Coding Sandbox",
		Description: "Hardware-isolated ephemeral Linux MicroVM for untrusted coding tasks",
		Category:    CategoryAIWorkload,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "microvm@coding-agent.service",
		SandboxTier: SandboxTierMicroVM,
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/virtualisation/microvm.nix",
			PackageName: "microvm.nix",
			FlakeInput:  "microvm",
		},
		Tags: []string{"microvm", "hypervisor", "isolation", "tier2", "security"},
	})
}
