package auth_test

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/l7v/panel-agent/internal/auth"
	"pgregory.net/rapid"
)

// Bug 4 — Hardcoded PIN + Brute Force
// Property 1: Bug Condition — No Default PIN & Brute Force Lockout
// Validates: Requirements 1.9, 1.10, 2.11, 2.12, 2.13, 2.14

func TestAuthManagerNoDefaultPIN(t *testing.T) {
	// Ensure no auth env vars
	t.Setenv("PANEL_AUTH_PIN", "")
	t.Setenv("PANEL_AUTH_PASSWORD", "")

	mgr := auth.NewManager()
	st := mgr.GetStatus("")
	if st.AuthEnabled {
		t.Fatalf("expected AuthEnabled=false when no env vars set, got true")
	}
	if st.AuthMethod != "none" {
		t.Fatalf("expected AuthMethod='none', got %q", st.AuthMethod)
	}

	// Now configure an explicit PIN
	t.Setenv("PANEL_AUTH_PIN", "mysecretpin")
	mgrWithPin := auth.NewManager()
	stWithPin := mgrWithPin.GetStatus("")
	if !stWithPin.AuthEnabled {
		t.Fatalf("expected AuthEnabled=true when PANEL_AUTH_PIN is set")
	}
	if stWithPin.AuthMethod != "pin" {
		t.Fatalf("expected AuthMethod='pin', got %q", stWithPin.AuthMethod)
	}

	// Attempt login with the old hardcoded default "1707" — MUST FAIL
	_, err := mgrWithPin.Login("1707", "", "192.168.1.10")
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials for default PIN 1707, got %v", err)
	}

	// Login with correct PIN must succeed
	sess, err := mgrWithPin.Login("mysecretpin", "", "192.168.1.10")
	if err != nil {
		t.Fatalf("expected login to succeed with correct PIN, got %v", err)
	}
	if sess.Token == "" {
		t.Fatalf("expected non-empty session token")
	}
}

func TestLoginBruteForceProtection(t *testing.T) {
	t.Setenv("PANEL_AUTH_PIN", "correct-pin")
	t.Setenv("PANEL_AUTH_MAX_ATTEMPTS", "5")
	t.Setenv("PANEL_AUTH_LOCKOUT_DURATION", "5m")

	mgr := auth.NewManager()
	ip := "192.168.1.100"

	// 5 failed login attempts
	for i := 1; i <= 5; i++ {
		_, err := mgr.Login("wrong-pin", "", ip)
		if !errors.Is(err, auth.ErrInvalidCredentials) {
			t.Fatalf("attempt %d: expected ErrInvalidCredentials, got %v", i, err)
		}
	}

	// 6th attempt (and subsequent) must return ErrLockedOut
	_, err := mgr.Login("wrong-pin", "", ip)
	if !errors.Is(err, auth.ErrLockedOut) {
		t.Fatalf("attempt 6: expected ErrLockedOut, got %v", err)
	}

	// Even correct PIN during lockout must be rejected
	_, err = mgr.Login("correct-pin", "", ip)
	if !errors.Is(err, auth.ErrLockedOut) {
		t.Fatalf("attempt with correct PIN during lockout: expected ErrLockedOut, got %v", err)
	}

	// Different IP should NOT be locked out
	otherIP := "192.168.1.101"
	sess, err := mgr.Login("correct-pin", "", otherIP)
	if err != nil {
		t.Fatalf("expected other IP to succeed, got %v", err)
	}
	if sess.Token == "" {
		t.Fatalf("expected valid token for other IP")
	}
}

func TestLoginLockoutExpiry(t *testing.T) {
	t.Setenv("PANEL_AUTH_PIN", "correct-pin")
	t.Setenv("PANEL_AUTH_MAX_ATTEMPTS", "2")
	t.Setenv("PANEL_AUTH_LOCKOUT_DURATION", "50ms")

	mgr := auth.NewManager()
	ip := "192.168.1.200"

	_, _ = mgr.Login("wrong", "", ip)
	_, _ = mgr.Login("wrong", "", ip)

	// Now locked out
	_, err := mgr.Login("wrong", "", ip)
	if !errors.Is(err, auth.ErrLockedOut) {
		t.Fatalf("expected ErrLockedOut, got %v", err)
	}

	// Wait for lockout duration to expire
	time.Sleep(60 * time.Millisecond)

	// Now login should evaluate credentials again
	_, err = mgr.Login("wrong", "", ip)
	if !errors.Is(err, auth.ErrInvalidCredentials) {
		t.Fatalf("expected ErrInvalidCredentials after lockout expired, got %v", err)
	}

	// And correct credentials succeed
	sess, err := mgr.Login("correct-pin", "", ip)
	if err != nil {
		t.Fatalf("expected success with correct credentials, got %v", err)
	}
	if sess.Token == "" {
		t.Fatalf("expected valid token")
	}
}

// Property 2: Preservation — Explicit Credentials and Session Lifecycle
// Validates: Requirements 3.10, 3.11, 3.12, 3.13

func TestAuthPreservation_Lifecycle(t *testing.T) {
	t.Run("PINLifecycle", func(t *testing.T) {
		t.Setenv("PANEL_AUTH_PIN", "secret42")
		t.Setenv("PANEL_AUTH_PASSWORD", "")
		mgr := auth.NewManager()

		sess, err := mgr.Login("secret42", "", "10.0.0.1")
		if err != nil {
			t.Fatalf("failed login: %v", err)
		}
		if !mgr.Verify(sess.Token) {
			t.Fatalf("expected token to verify")
		}

		st := mgr.GetStatus(sess.Token)
		if !st.ActiveSession || !st.AuthEnabled {
			t.Fatalf("unexpected status: %+v", st)
		}

		mgr.Logout(sess.Token)
		if mgr.Verify(sess.Token) {
			t.Fatalf("expected token to be invalid after logout")
		}
	})

	t.Run("PasswordLifecycle", func(t *testing.T) {
		t.Setenv("PANEL_AUTH_PIN", "")
		t.Setenv("PANEL_AUTH_PASSWORD", "supersecretpassword")
		mgr := auth.NewManager()

		st := mgr.GetStatus("")
		if !st.AuthEnabled || st.AuthMethod != "password" {
			t.Fatalf("expected password auth enabled, got %+v", st)
		}

		sess, err := mgr.Login("", "supersecretpassword", "10.0.0.2")
		if err != nil {
			t.Fatalf("failed password login: %v", err)
		}
		if !mgr.Verify(sess.Token) {
			t.Fatalf("expected token to verify")
		}

		mgr.Logout(sess.Token)
		if mgr.Verify(sess.Token) {
			t.Fatalf("expected token to be revoked")
		}
	})
}

func TestProperty_AuthRateLimitPreservation(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		pin := rapid.StringMatching(`[0-9]{4,8}`).Draw(tc, "pin")
		t.Setenv("PANEL_AUTH_PIN", pin)
		t.Setenv("PANEL_AUTH_PASSWORD", "")
		t.Setenv("PANEL_AUTH_MAX_ATTEMPTS", "5")

		mgr := auth.NewManager()

		// Generate random IP
		ip := fmt.Sprintf("192.168.%d.%d",
			rapid.IntRange(1, 254).Draw(tc, "subnet"),
			rapid.IntRange(1, 254).Draw(tc, "host"))

		// 1 to 4 failed attempts (below maxAttempts=5)
		failedAttempts := rapid.IntRange(1, 4).Draw(tc, "failedAttempts")
		for i := 0; i < failedAttempts; i++ {
			_, err := mgr.Login("wrong-"+pin, "", ip)
			if !errors.Is(err, auth.ErrInvalidCredentials) {
				tc.Fatalf("attempt %d: expected ErrInvalidCredentials, got %v", i+1, err)
			}
		}

		// Correct PIN on same IP before threshold must succeed
		sess, err := mgr.Login(pin, "", ip)
		if err != nil {
			tc.Fatalf("expected success with correct PIN, got %v", err)
		}
		if !mgr.Verify(sess.Token) {
			tc.Fatalf("expected token to be valid")
		}
	})
}
