package apps

func init() {
	Register(Application{
		ID:          "vibe-kanban",
		Name:        "Vibe Kanban Board Server",
		Description: "Multi-agent autonomous task orchestration and project management background daemon",
		Category:    CategoryAIWorkload,
		Status:      StatusStandby,
		AccessLevel: AccessTailscaleMesh,
		SystemdUnit: "vibe-kanban.service",
		SandboxTier: SandboxTierClaudebox,
		Endpoints: []AppEndpoint{
			{Type: "http", URL: "http://localhost:3333", Port: 3333, AccessLevel: AccessTailscaleMesh, Internal: true},
		},
		Provenance: NixProvenance{
			DeclaredIn:  "home/profiles/ai-tools.nix",
			PackageName: "vibe-kanban",
			FlakeInput:  "llm-agents",
		},
		Tags: []string{"ai", "kanban", "tasks", "orchestration", "daemon"},
	})
}
