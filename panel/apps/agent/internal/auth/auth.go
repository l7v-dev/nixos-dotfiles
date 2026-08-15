package auth

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"sync"
	"time"
)

// Session represents an authenticated web user session.
type Session struct {
	Token     string    `json:"token"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	ClientIP  string    `json:"client_ip,omitempty"`
}

// AuthStatus represents the current authentication configuration.
type AuthStatus struct {
	AuthEnabled   bool      `json:"auth_enabled"`
	AuthMethod    string    `json:"auth_method"` // "pin", "password", "none"
	ActiveSession bool      `json:"active_session"`
	ExpiresAt     time.Time `json:"expires_at,omitempty"`
}

// Manager defines the interface for PIN/password web session authentication.
type Manager interface {
	GetStatus(token string) AuthStatus
	Login(pin string, password string, clientIP string) (*Session, error)
	Verify(token string) bool
	Logout(token string)
}

type sessionManager struct {
	mu            sync.RWMutex
	expectedPIN   string
	expectedPass  string
	sessions      map[string]*Session
	sessionExpiry time.Duration
}

// NewManager creates a new session and PIN authentication manager.
func NewManager() Manager {
	pin := os.Getenv("PANEL_AUTH_PIN")
	pass := os.Getenv("PANEL_AUTH_PASSWORD")

	// Default PIN is 1707 if not specified in environment
	if pin == "" && pass == "" {
		pin = "1707"
	}

	return &sessionManager{
		expectedPIN:   pin,
		expectedPass:  pass,
		sessions:      make(map[string]*Session),
		sessionExpiry: 24 * time.Hour,
	}
}

// GetStatus returns whether auth is enabled and whether the provided token is currently valid.
func (sm *sessionManager) GetStatus(token string) AuthStatus {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	method := "pin"
	if sm.expectedPass != "" {
		method = "password"
	}

	status := AuthStatus{
		AuthEnabled:   sm.expectedPIN != "" || sm.expectedPass != "",
		AuthMethod:    method,
		ActiveSession: false,
	}

	if token != "" {
		if sess, ok := sm.sessions[token]; ok {
			if time.Now().Before(sess.ExpiresAt) {
				status.ActiveSession = true
				status.ExpiresAt = sess.ExpiresAt
			}
		}
	}

	return status
}

// Login verifies the provided PIN or password and returns a new session token.
func (sm *sessionManager) Login(pin string, password string, clientIP string) (*Session, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Verify PIN or password
	valid := false
	if sm.expectedPIN != "" && pin == sm.expectedPIN {
		valid = true
	}
	if sm.expectedPass != "" && password == sm.expectedPass {
		valid = true
	}

	if !valid {
		return nil, ErrInvalidCredentials
	}

	// Generate secure random token
	tokenBytes := make([]byte, 24)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	now := time.Now()
	sess := &Session{
		Token:     token,
		CreatedAt: now,
		ExpiresAt: now.Add(sm.sessionExpiry),
		ClientIP:  clientIP,
	}

	sm.sessions[token] = sess

	// Purge expired sessions
	for k, s := range sm.sessions {
		if now.After(s.ExpiresAt) {
			delete(sm.sessions, k)
		}
	}

	return sess, nil
}

// Verify checks if the provided token is active.
func (sm *sessionManager) Verify(token string) bool {
	if token == "" {
		return false
	}

	sm.mu.RLock()
	defer sm.mu.RUnlock()

	sess, ok := sm.sessions[token]
	if !ok {
		return false
	}

	return time.Now().Before(sess.ExpiresAt)
}

// Logout invalidates a session token.
func (sm *sessionManager) Logout(token string) {
	if token == "" {
		return
	}

	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.sessions, token)
}

type authError string

func (e authError) Error() string { return string(e) }

const (
	ErrInvalidCredentials = authError("geçersiz PIN veya parola")
)
