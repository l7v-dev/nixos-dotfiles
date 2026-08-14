package apps

func init() {
	Register(Application{
		ID:          "libvirtd",
		Name:        "Libvirt KVM Hypervisor",
		Description: "Hardware virtualization management daemon providing kernel-based virtual machines (KVM/QEMU)",
		Category:    CategoryAIWorkload,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "libvirtd.service",
		SandboxTier: SandboxTierMicroVM,
		Endpoints: []AppEndpoint{
			{Type: "unix", URL: "/run/libvirt/libvirt-sock", AccessLevel: AccessInternalOnly, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/virtualisation/libvirt.nix",
			PackageName: "libvirtd",
			FlakeInput:  "nixpkgs",
		},
		Tags: []string{"virtualisation", "kvm", "hypervisor", "vms", "isolation"},
	})
}
