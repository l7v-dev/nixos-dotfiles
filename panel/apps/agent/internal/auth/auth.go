package auth

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strconv"
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

type attemptTracker struct {
	count       int
	windowStart time.Time
}

type sessionManager struct {
	mu              sync.RWMutex
	expectedPIN     string
	expectedPass    string
	authDisabled    bool
	sessions        map[string]*Session
	sessionExpiry   time.Duration
	attempts        map[string]*attemptTracker
	maxAttempts     int
	window          time.Duration
	lockoutDuration time.Duration
}

func envIntAuth(key string, def int) int {
	if val := os.Getenv(key); val != "" {
		if n, err := strconv.Atoi(val); err == nil && n > 0 {
			return n
		}
	}
	return def
}

func envDurationAuth(key string, def time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil && d > 0 {
			return d
		}
	}
	return def
}

// NewManager creates a new session and PIN/password authentication manager.
// If neither PANEL_AUTH_PIN nor PANEL_AUTH_PASSWORD is set, authentication is disabled.
func NewManager() Manager {
	pin := os.Getenv("PANEL_AUTH_PIN")
	pass := os.Getenv("PANEL_AUTH_PASSWORD")

	authDisabled := pin == "" && pass == ""

	maxAttempts := envIntAuth("PANEL_AUTH_MAX_ATTEMPTS", 5)
	lockoutDuration := envDurationAuth("PANEL_AUTH_LOCKOUT_DURATION", 5*time.Minute)

	return &sessionManager{
		expectedPIN:     pin,
		expectedPass:    pass,
		authDisabled:    authDisabled,
		sessions:        make(map[string]*Session),
		sessionExpiry:   24 * time.Hour,
		attempts:        make(map[string]*attemptTracker),
		maxAttempts:     maxAttempts,
		window:          time.Minute,
		lockoutDuration: lockoutDuration,
	}
}

// GetStatus returns whether auth is enabled and whether the provided token is currently valid.
func (sm *sessionManager) GetStatus(token string) AuthStatus {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	method := "none"
	if !sm.authDisabled {
		method = "pin"
		if sm.expectedPass != "" {
			method = "password"
		}
	}

	status := AuthStatus{
		AuthEnabled:   !sm.authDisabled,
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
// Per-IP rate limiting and lockout are enforced when auth is enabled.
func (sm *sessionManager) Login(pin string, password string, clientIP string) (*Session, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	now := time.Now()

	// If auth is disabled, skip credential check and issue a session immediately
	if sm.authDisabled {
		tokenBytes := make([]byte, 24)
		_, _ = rand.Read(tokenBytes)
		token := hex.EncodeToString(tokenBytes)

		sess := &Session{
			Token:     token,
			CreatedAt: now,
			ExpiresAt: now.Add(sm.sessionExpiry),
			ClientIP:  clientIP,
		}
		sm.sessions[token] = sess
		return sess, nil
	}

	// Check per-IP rate limiting
	tracker, ok := sm.attempts[clientIP]
	if ok {
		if now.Sub(tracker.windowStart) >= sm.window {
			tracker.count = 0
			tracker.windowStart = now
		} else if tracker.count >= sm.maxAttempts && now.Sub(tracker.windowStart) < sm.lockoutDuration {
			return nil, ErrLockedOut
		}
	}

	// Verify PIN or password
	valid := false
	if sm.expectedPIN != "" && pin == sm.expectedPIN {
		valid = true
	}
	if sm.expectedPass != "" && password == sm.expectedPass {
		valid = true
	}

	if !valid {
		if tracker == nil {
			sm.attempts[clientIP] = &attemptTracker{
				count:       1,
				windowStart: now,
			}
		} else {
			tracker.count++
		}
		return nil, ErrInvalidCredentials
	}

	// Clear attempts on success
	delete(sm.attempts, clientIP)

	// Generate secure random token
	tokenBytes := make([]byte, 24)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

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
	ErrLockedOut          = authError("çok fazla başarısız giriş denemesi; lütfen daha sonra tekrar deneyin")
)
