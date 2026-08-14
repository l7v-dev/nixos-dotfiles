package apps

func init() {
	Register(Application{
		ID:          "buildkite-agent",
		Name:        "Buildkite CI Runner",
		Description: "Continuous integration build runner daemon for automated pipelines and tests",
		Category:    CategoryCICDAuto,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "buildkite-agent.service",
		SandboxTier: SandboxTierNone,
		Provenance: NixProvenance{
			DeclaredIn:  "modules/platform/ci/default.nix",
			PackageName: "buildkite-agent",
			FlakeInput:  "nixpkgs",
			SecretKeys:  []string{"buildkite/token"},
		},
		Tags: []string{"ci", "build", "pipeline", "runner"},
	})
}
