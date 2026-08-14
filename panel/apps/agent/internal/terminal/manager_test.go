package terminal

import (
	"testing"
)

func TestSessionManager(t *testing.T) {
	sm := NewSessionManager(nil)
	defer sm.CloseAll()

	// Create session 1
	s1, err := sm.CreateSession(SessionOptions{
		Title: "Tab 1",
	})
	if err != nil {
		t.Fatalf("failed to create session 1: %v", err)
	}

	// Create session 2
	s2, err := sm.CreateSession(SessionOptions{
		Title: "Tab 2",
	})
	if err != nil {
		t.Fatalf("failed to create session 2: %v", err)
	}

	// List sessions
	list := sm.ListSessions()
	if len(list) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(list))
	}

	// Get session
	retrieved, ok := sm.GetSession(s1.ID)
	if !ok || retrieved.ID != s1.ID {
		t.Fatalf("failed to get session %s", s1.ID)
	}

	// Kill session
	if err := sm.KillSession(s1.ID); err != nil {
		t.Fatalf("failed to kill session 1: %v", err)
	}

	listAfter := sm.ListSessions()
	if len(listAfter) != 1 || listAfter[0].ID != s2.ID {
		t.Fatalf("expected 1 session remaining (s2), got: %+v", listAfter)
	}
}
