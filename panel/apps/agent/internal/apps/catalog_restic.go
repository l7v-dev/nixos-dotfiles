package apps

func init() {
	Register(Application{
		ID:          "restic-backup",
		Name:        "Restic Remote Backup",
		Description: "Automated snapshot backup service to encrypted remote S3/B2 storage",
		Category:    CategoryBackupDR,
		Status:      StatusStopped,
		AccessLevel: AccessInternalOnly,
		SystemdUnit: "restic-backups-system.service",
		SandboxTier: SandboxTierNone,
		Provenance: NixProvenance{
			DeclaredIn:  "modules/capabilities/backup/restic.nix",
			PackageName: "restic",
			FlakeInput:  "nixpkgs",
			SecretKeys:  []string{"backup/restic_password"},
		},
		Tags: []string{"backup", "security", "snapshots", "s3", "dr"},
	})
}
