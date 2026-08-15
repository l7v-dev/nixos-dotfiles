package auth

import (
	"testing"
)

func TestAuthLifecycle(t *testing.T) {
	mgr := NewManager()

	// 1. Initial status with empty token
	st := mgr.GetStatus("")
	if !st.AuthEnabled {
		t.Fatal("expected auth to be enabled by default")
	}
	if st.ActiveSession {
		t.Fatal("expected no active session initially")
	}

	// 2. Failed login with wrong PIN
	_, err := mgr.Login("9999", "", "127.0.0.1")
	if err == nil {
		t.Fatal("expected login to fail with wrong PIN")
	}

	// 3. Successful login with default PIN (1707)
	sess, err := mgr.Login("1707", "", "127.0.0.1")
	if err != nil {
		t.Fatalf("login failed with default PIN: %v", err)
	}
	if sess.Token == "" {
		t.Fatal("expected non-empty token")
	}

	// 4. Verify token
	if !mgr.Verify(sess.Token) {
		t.Fatal("expected token to be valid")
	}

	// 5. Check status with valid token
	st = mgr.GetStatus(sess.Token)
	if !st.ActiveSession {
		t.Fatal("expected active session with valid token")
	}

	// 6. Logout
	mgr.Logout(sess.Token)
	if mgr.Verify(sess.Token) {
		t.Fatal("expected token to be revoked after logout")
	}
}
