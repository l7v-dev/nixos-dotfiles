package terminal

import (
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	// DefaultSessionIdleTimeout: dead or inactive sessions without subscribers cleaned up after 1 hour.
	DefaultSessionIdleTimeout = 1 * time.Hour
	// ReapInterval checks for expired sessions every 5 minutes.
	ReapInterval = 5 * time.Minute
)

// SessionManager manages active PTY sessions across the panel agent.
type SessionManager struct {
	mu          sync.RWMutex
	sessions    map[string]*Session
	logger      *slog.Logger
	idleTimeout time.Duration
	stopReaper  chan struct{}
}

// NewSessionManager initializes a session manager and starts the background reaper.
func NewSessionManager(logger *slog.Logger) *SessionManager {
	if logger == nil {
		logger = slog.Default()
	}
	sm := &SessionManager{
		sessions:    make(map[string]*Session),
		logger:      logger.With("component", "terminal_manager"),
		idleTimeout: DefaultSessionIdleTimeout,
		stopReaper:  make(chan struct{}),
	}

	go sm.reapLoop()
	return sm
}

// CreateSession allocates a new terminal session with a unique UUID.
func (sm *SessionManager) CreateSession(opts SessionOptions) (*Session, error) {
	if opts.ID == "" {
		opts.ID = uuid.New().String()
	}
	opts.Logger = sm.logger
	opts.OnExit = func(id string, exitCode int) {
		sm.logger.Info("session exited", "session_id", id, "exit_code", exitCode)
	}

	session, err := NewSession(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	sm.mu.Lock()
	sm.sessions[opts.ID] = session
	sm.mu.Unlock()

	sm.logger.Info("terminal session created",
		"session_id", opts.ID,
		"title", opts.Title,
		"shell", opts.Shell,
		"pid", session.PID,
	)

	return session, nil
}

// GetSession retrieves an active session by ID.
func (sm *SessionManager) GetSession(id string) (*Session, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, ok := sm.sessions[id]
	return session, ok
}

// GetOrCreateDefaultSession returns the latest alive session or creates a new one.
func (sm *SessionManager) GetOrCreateDefaultSession(title string) (*Session, error) {
	sm.mu.RLock()
	for _, s := range sm.sessions {
		if s.IsAlive() {
			sm.mu.RUnlock()
			return s, nil
		}
	}
	sm.mu.RUnlock()

	return sm.CreateSession(SessionOptions{
		Title: title,
	})
}

// ListSessions returns snapshots of all managed sessions.
func (sm *SessionManager) ListSessions() []SessionInfo {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	result := make([]SessionInfo, 0, len(sm.sessions))
	for _, s := range sm.sessions {
		result = append(result, s.Info())
	}
	return result
}

// KillSession stops the session and removes it from the manager.
func (sm *SessionManager) KillSession(id string) error {
	sm.mu.Lock()
	session, exists := sm.sessions[id]
	if !exists {
		sm.mu.Unlock()
		return fmt.Errorf("session %q not found", id)
	}
	delete(sm.sessions, id)
	sm.mu.Unlock()

	_ = session.Kill()
	sm.logger.Info("terminal session killed and removed", "session_id", id)
	return nil
}

// reapLoop periodically cleans up dead sessions older than idleTimeout.
func (sm *SessionManager) reapLoop() {
	ticker := time.NewTicker(ReapInterval)
	defer ticker.Stop()

	for {
		select {
		case <-sm.stopReaper:
			return
		case <-ticker.C:
			sm.reapExpired()
		}
	}
}

func (sm *SessionManager) reapExpired() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	now := time.Now()
	for id, s := range sm.sessions {
		info := s.Info()
		// If closed and idle for more than timeout, remove
		if !info.IsAlive && info.Subscribers == 0 && now.Sub(info.LastActive) > sm.idleTimeout {
			sm.logger.Info("reaping dead terminal session", "session_id", id)
			_ = s.Kill()
			delete(sm.sessions, id)
		}
	}
}

// CloseAll kills all running sessions and stops background routines.
func (sm *SessionManager) CloseAll() {
	close(sm.stopReaper)

	sm.mu.Lock()
	defer sm.mu.Unlock()

	for id, s := range sm.sessions {
		_ = s.Kill()
		delete(sm.sessions, id)
	}
	sm.logger.Info("all terminal sessions closed")
}
