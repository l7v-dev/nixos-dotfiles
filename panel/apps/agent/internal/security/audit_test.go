package security

import (
	"context"
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

	score, grade, recs := CalculateSecurityScore(true, true, sopsOk, f2bOk, portsSafe)

	if score < 90 {
		t.Fatalf("expected score >= 90 for secure system, got %d", score)
	}
	if grade != "A+" {
		t.Fatalf("expected grade A+, got %s", grade)
	}
	if len(recs) > 0 {
		t.Fatalf("expected 0 recommendations for fully secured system, got %d", len(recs))
	}
}

func TestListDetailedPorts(t *testing.T) {
	ctx := context.Background()
	ports := ListDetailedPorts(ctx)
	// Even in container/test environment, function should return a non-nil slice without panics
	if ports == nil {
		t.Fatal("expected non-nil ports slice")
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
