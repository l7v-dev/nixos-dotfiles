package security

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCalculateSecurityScore(t *testing.T) {
	sopsOk := SOPSAuditReport{
		KeyFileExists:    true,
		RegisteredInSops: true,
		DecryptionOk:     true,
	}

	f2bOk := Fail2banStatus{
		Enabled:     true,
		ActiveJails: 2,
	}

	portsSafe := []PortAuditItem{
		{Port: 22, Exposure: ExposureLocalhost},
		{Port: 80, Exposure: ExposurePublic},
		{Port: 443, Exposure: ExposurePublic},
	}

	score, grade, _ := CalculateSecurityScore(true, true, sopsOk, f2bOk, portsSafe)

	if score < 85 {
		t.Fatalf("expected score >= 85 for secure system, got %d", score)
	}
	if grade != "A+" && grade != "A" {
		t.Fatalf("expected grade A or A+, got %s", grade)
	}
}

func TestCalculateSecurityScore_Insecure(t *testing.T) {
	sopsBad := SOPSAuditReport{
		KeyFileExists:    false,
		RegisteredInSops: false,
		DecryptionOk:     false,
	}

	f2bBad := Fail2banStatus{
		Enabled:     false,
		ActiveJails: 0,
	}

	portsInsecure := []PortAuditItem{
		{Port: 22, Exposure: ExposurePublic},
		{Port: 5432, Exposure: ExposurePublic},
		{Port: 8080, Exposure: ExposurePublic},
	}

	score, grade, recs := CalculateSecurityScore(false, false, sopsBad, f2bBad, portsInsecure)

	if score > 60 {
		t.Fatalf("expected score <= 60 for insecure system, got %d", score)
	}
	if grade != "C" && grade != "F" {
		t.Fatalf("expected grade C or F, got %s", grade)
	}
	if len(recs) == 0 {
		t.Fatal("expected recommendations for insecure system")
	}
}

func TestListDetailedPorts(t *testing.T) {
	ctx := context.Background()
	ports := ListDetailedPorts(ctx)
	if ports == nil {
		t.Fatal("expected non-nil ports slice")
	}
}

func TestParseHexIP(t *testing.T) {
	// Localhost: 0100007F (127.0.0.1)
	ip, exp := parseHexIP("0100007F", "tcp")
	if ip != "127.0.0.1" || exp != ExposureLocalhost {
		t.Fatalf("expected 127.0.0.1 localhost, got %s %s", ip, exp)
	}

	// Any: 00000000 (0.0.0.0)
	ip, exp = parseHexIP("00000000", "tcp")
	if ip != "0.0.0.0" || exp != ExposurePublic {
		t.Fatalf("expected 0.0.0.0 public, got %s %s", ip, exp)
	}
}

func TestGetSOPSSecretsSummary(t *testing.T) {
	tmpDir := t.TempDir()
	sopsDir := filepath.Join(tmpDir, "secrets", "sops")
	if err := os.MkdirAll(sopsDir, 0755); err != nil {
		t.Fatal(err)
	}

	sampleSecrets := `
cache/signing_key: ENC[AES256_GCM,data:abc,iv:123,tag:xyz,type:str]
database/postgres_password: ENC[AES256_GCM,data:def,iv:456,tag:uvw,type:str]
backup/restic_password: ENC[AES256_GCM,data:ghi,iv:789,tag:rst,type:str]
forgejo/admin_password: ENC[AES256_GCM,data:jkl,iv:012,tag:opq,type:str]
sops:
    age:
        - enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            test
            -----END AGE ENCRYPTED FILE-----
          recipient: age1testkey12345
    lastmodified: "2026-06-17T18:19:50Z"
    version: 3.13.1
`
	if err := os.WriteFile(filepath.Join(sopsDir, "secrets.yaml"), []byte(sampleSecrets), 0644); err != nil {
		t.Fatal(err)
	}

	secrets, err := GetSOPSSecretsSummary(tmpDir)
	if err != nil {
		t.Fatalf("GetSOPSSecretsSummary failed: %v", err)
	}

	if len(secrets) != 4 {
		t.Fatalf("expected 4 secrets, got %d", len(secrets))
	}

	if secrets[0].Key != "cache/signing_key" || secrets[0].Category != "cache" || !secrets[0].Encrypted {
		t.Fatalf("unexpected secret item: %+v", secrets[0])
	}
	if secrets[3].AssociatedApp != "forgejo" {
		t.Fatalf("expected associated app forgejo, got %s", secrets[3].AssociatedApp)
	}
}

func TestSecurityClientAudit(t *testing.T) {
	client := NewClient()
	ctx := context.Background()

	report, err := client.GetAuditReport(ctx)
	if err != nil {
		t.Fatalf("GetAuditReport failed: %v", err)
	}

	if report.Score < 0 || report.Score > 100 {
		t.Fatalf("invalid score range: %d", report.Score)
	}
	if report.Grade == "" {
		t.Fatal("empty grade returned")
	}
}
