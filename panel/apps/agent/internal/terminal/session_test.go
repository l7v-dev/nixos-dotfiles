package terminal

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestRingBuffer(t *testing.T) {
	rb := NewRingBuffer(10)

	// Write smaller than capacity
	n, err := rb.Write([]byte("hello"))
	if err != nil || n != 5 {
		t.Fatalf("unexpected write result: n=%d, err=%v", n, err)
	}
	if string(rb.Bytes()) != "hello" {
		t.Fatalf("expected 'hello', got %q", string(rb.Bytes()))
	}

	// Write causing wrap-around
	_, _ = rb.Write([]byte(" world!"))
	// "hello world!" is 12 bytes, cap is 10 -> should keep last 10 bytes: "llo world!"
	got := string(rb.Bytes())
	if got != "llo world!" {
		t.Fatalf("expected 'llo world!', got %q", got)
	}

	// Reset
	rb.Reset()
	if rb.Bytes() != nil {
		t.Fatalf("expected nil after reset, got %q", string(rb.Bytes()))
	}
}

func TestResolveShell(t *testing.T) {
	// Shell empty string should resolve to something non-empty
	resolved := resolveShell("")
	if resolved == "" {
		t.Fatal("expected non-empty shell for empty string")
	}

	// Non-existent absolute path should fall back to PATH resolution if possible
	shResolved := resolveShell("/bin/sh")
	if shResolved == "" {
		t.Fatal("expected non-empty shell for /bin/sh")
	}
}

func TestSessionLifecycle(t *testing.T) {
	session, err := NewSession(SessionOptions{
		ID:    "test-session-1",
		Title: "Test Shell",
		Cols:  80,
		Rows:  24,
	})
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}
	defer session.Kill()

	if !session.IsAlive() {
		t.Fatal("expected session to be alive")
	}

	info := session.Info()
	if info.ID != "test-session-1" || info.Title != "Test Shell" {
		t.Fatalf("unexpected session info: %+v", info)
	}

	// Test attach and output
	_, outCh, unsub := session.Attach()
	defer unsub()

	// Write command to echo something
	_, err = session.Write([]byte("echo 'TERMINAL_TEST_OK'\n"))
	if err != nil {
		t.Fatalf("failed to write to session: %v", err)
	}

	// Read output until expected string is seen or timeout
	found := false
	timeout := time.After(3 * time.Second)
	var accumulated bytes.Buffer

	for !found {
		select {
		case chunk, ok := <-outCh:
			if !ok {
				t.Fatal("outCh closed unexpectedly")
			}
			accumulated.Write(chunk)
			if strings.Contains(accumulated.String(), "TERMINAL_TEST_OK") {
				found = true
			}
		case <-timeout:
			t.Fatalf("timed out waiting for output, accumulated: %q", accumulated.String())
		}
	}

	// Test Resize
	if err := session.Resize(120, 40); err != nil {
		t.Fatalf("failed to resize session: %v", err)
	}

	// Test Kill
	if err := session.Kill(); err != nil {
		t.Fatalf("failed to kill session: %v", err)
	}

	// Wait briefly for waitLoop
	time.Sleep(100 * time.Millisecond)
	if session.IsAlive() {
		t.Fatal("expected session to be terminated")
	}
}
