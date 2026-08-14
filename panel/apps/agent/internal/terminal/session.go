package terminal

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

const (
	// DefaultRingBufferCap is 4MB per session for scrollback history replay.
	DefaultRingBufferCap = 4 * 1024 * 1024
	// DefaultRows and DefaultCols for PTY initialization.
	DefaultRows = 30
	DefaultCols = 100
)

// RingBuffer is a thread-safe circular byte buffer with fixed max capacity.
type RingBuffer struct {
	mu       sync.RWMutex
	buf      []byte
	size     int
	capacity int
	writeIdx int
}

// NewRingBuffer allocates a circular buffer of given capacity.
func NewRingBuffer(cap int) *RingBuffer {
	if cap <= 0 {
		cap = DefaultRingBufferCap
	}
	return &RingBuffer{
		buf:      make([]byte, cap),
		capacity: cap,
	}
}

// Write appends data to the ring buffer, overwriting the oldest bytes when full.
func (r *RingBuffer) Write(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	n := len(p)
	if n >= r.capacity {
		// If input is larger than capacity, keep only the latest slice.
		p = p[n-r.capacity:]
		copy(r.buf, p)
		r.writeIdx = 0
		r.size = r.capacity
		return n, nil
	}

	for i := 0; i < n; i++ {
		r.buf[r.writeIdx] = p[i]
		r.writeIdx = (r.writeIdx + 1) % r.capacity
		if r.size < r.capacity {
			r.size++
		}
	}
	return n, nil
}

// Bytes returns a contiguous copy of all bytes in chronological order.
func (r *RingBuffer) Bytes() []byte {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.size == 0 {
		return nil
	}

	result := make([]byte, r.size)
	if r.size < r.capacity {
		copy(result, r.buf[:r.size])
	} else {
		// Buffer is full: writeIdx is the oldest byte.
		n := copy(result, r.buf[r.writeIdx:])
		copy(result[n:], r.buf[:r.writeIdx])
	}
	return result
}

// Reset clears the buffer content.
func (r *RingBuffer) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.size = 0
	r.writeIdx = 0
}

// SessionOptions defines parameters for starting a new PTY session.
type SessionOptions struct {
	ID       string
	Title    string
	User     string
	Shell    string
	Cwd      string
	Env      []string
	Cols     uint16
	Rows     uint16
	OnExit   func(id string, exitCode int)
	Logger   *slog.Logger
}

// Session manages a single running POSIX PTY process and client broadcast channels.
type Session struct {
	ID         string
	Title      string
	User       string
	Shell      string
	Cwd        string
	PID        int
	cols       uint16
	rows       uint16
	CreatedAt  time.Time
	LastActive time.Time

	mu          sync.RWMutex
	cmd         *exec.Cmd
	ptyFile     *os.File
	ringBuf     *RingBuffer
	subscribers map[chan []byte]struct{}
	closed      bool
	exitCode    int
	onExit      func(id string, exitCode int)
	logger      *slog.Logger
}

// resolveShell determines the appropriate shell binary to execute.
// It checks the requested path/name, $SHELL, PATH lookups (bash, sh), and falls back to /bin/sh.
func resolveShell(requested string) string {
	if requested != "" {
		if _, err := os.Stat(requested); err == nil {
			return requested
		}
		if path, err := exec.LookPath(filepath.Base(requested)); err == nil {
			return path
		}
		if path, err := exec.LookPath(requested); err == nil {
			return path
		}
	}

	if envShell := os.Getenv("SHELL"); envShell != "" {
		if _, err := os.Stat(envShell); err == nil {
			return envShell
		}
		if path, err := exec.LookPath(filepath.Base(envShell)); err == nil {
			return path
		}
	}

	if path, err := exec.LookPath("bash"); err == nil {
		return path
	}
	if path, err := exec.LookPath("sh"); err == nil {
		return path
	}

	return "/bin/sh"
}

// NewSession spawns a command inside a pseudo-terminal (PTY).
func NewSession(opts SessionOptions) (*Session, error) {
	if opts.Cols == 0 {
		opts.Cols = DefaultCols
	}
	if opts.Rows == 0 {
		opts.Rows = DefaultRows
	}
	opts.Shell = resolveShell(opts.Shell)
	if opts.Title == "" {
		opts.Title = "Terminal"
	}
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}

	cmd := exec.Command(opts.Shell)
	if opts.Cwd != "" {
		if _, err := os.Stat(opts.Cwd); err == nil {
			cmd.Dir = opts.Cwd
		}
	} else if home := os.Getenv("HOME"); home != "" {
		if _, err := os.Stat(home); err == nil {
			cmd.Dir = home
		}
	}
	if cmd.Dir == "" {
		if wd, err := os.Getwd(); err == nil {
			cmd.Dir = wd
		} else {
			cmd.Dir = os.TempDir()
		}
	}

	// Setup clean, functional environment
	defaultEnv := os.Environ()
	customEnv := []string{
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
		"LANG=en_US.UTF-8",
		"LC_ALL=en_US.UTF-8",
	}
	cmd.Env = append(defaultEnv, customEnv...)
	if len(opts.Env) > 0 {
		cmd.Env = append(cmd.Env, opts.Env...)
	}

	winsize := &pty.Winsize{
		Rows: opts.Rows,
		Cols: opts.Cols,
	}

	ptyFile, err := pty.StartWithSize(cmd, winsize)
	if err != nil {
		return nil, fmt.Errorf("failed to start pty: %w", err)
	}

	s := &Session{
		ID:          opts.ID,
		Title:       opts.Title,
		User:        opts.User,
		Shell:       opts.Shell,
		Cwd:         cmd.Dir,
		PID:         cmd.Process.Pid,
		cols:        opts.Cols,
		rows:        opts.Rows,
		CreatedAt:   time.Now(),
		LastActive:  time.Now(),
		cmd:         cmd,
		ptyFile:     ptyFile,
		ringBuf:     NewRingBuffer(DefaultRingBufferCap),
		subscribers: make(map[chan []byte]struct{}),
		onExit:      opts.OnExit,
		logger:      opts.Logger.With("session_id", opts.ID, "pid", cmd.Process.Pid),
	}

	// Start pump reader from PTY master
	go s.readLoop()

	// Start process wait reaper
	go s.waitLoop()

	return s, nil
}

// readLoop reads raw stdout/stderr from the master PTY and broadcasts it.
func (s *Session) readLoop() {
	buf := make([]byte, 8192)
	for {
		n, err := s.ptyFile.Read(buf)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buf[:n])

			// Cache in ring buffer
			s.ringBuf.Write(chunk)

			// Broadcast to all active subscribers
			s.mu.Lock()
			s.LastActive = time.Now()
			for ch := range s.subscribers {
				select {
				case ch <- chunk:
				default:
					// Drop if subscriber channel is blocked to avoid stalling PTY
				}
			}
			s.mu.Unlock()
		}

		if err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, syscall.EIO) || errors.Is(err, os.ErrClosed) {
				s.logger.Debug("pty read stream closed")
			} else {
				s.logger.Warn("pty read error", "err", err)
			}
			break
		}
	}
}

// waitLoop waits for process exit and triggers cleanup.
func (s *Session) waitLoop() {
	err := s.cmd.Wait()
	exitCode := 0
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	s.mu.Lock()
	s.closed = true
	s.exitCode = exitCode
	s.LastActive = time.Now()
	// Close all subscriber channels to notify connected WebSockets
	for ch := range s.subscribers {
		close(ch)
		delete(s.subscribers, ch)
	}
	s.mu.Unlock()

	s.logger.Info("session process exited", "exit_code", exitCode)
	if s.onExit != nil {
		s.onExit(s.ID, exitCode)
	}
}

// Attach registers a listener and returns the current scrollback history.
func (s *Session) Attach() ([]byte, chan []byte, func()) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.LastActive = time.Now()
	history := s.ringBuf.Bytes()

	if s.closed {
		ch := make(chan []byte)
		close(ch)
		return history, ch, func() {}
	}

	ch := make(chan []byte, 128)
	s.subscribers[ch] = struct{}{}

	unsubscribe := func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if _, exists := s.subscribers[ch]; exists {
			delete(s.subscribers, ch)
			close(ch)
		}
	}

	return history, ch, unsubscribe
}

// IsClosed reports whether the session process has finished or was terminated.
func (s *Session) IsClosed() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.closed
}

// Write writes data to master PTY (stdin of running shell).
func (s *Session) Write(p []byte) (int, error) {
	s.mu.RLock()
	closed := s.closed
	s.mu.RUnlock()

	if closed {
		return 0, os.ErrClosed
	}

	s.mu.Lock()
	s.LastActive = time.Now()
	s.mu.Unlock()

	return s.ptyFile.Write(p)
}

// Resize changes the terminal dimensions (SIGWINCH).
func (s *Session) Resize(cols, rows uint16) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed || s.ptyFile == nil {
		return os.ErrClosed
	}

	if s.cols == cols && s.rows == rows {
		return nil
	}
	s.cols = cols
	s.rows = rows

	return pty.Setsize(s.ptyFile, &pty.Winsize{
		Rows: rows,
		Cols: cols,
	})
}

// Signal sends an OS signal (e.g. SIGINT, SIGTERM) to the child process.
func (s *Session) Signal(sig syscall.Signal) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed || s.cmd == nil || s.cmd.Process == nil {
		return os.ErrClosed
	}

	return s.cmd.Process.Signal(sig)
}

// Kill terminates the session and frees the PTY master.
func (s *Session) Kill() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}

	s.closed = true
	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Signal(syscall.SIGTERM)
		// Give it 200ms to terminate gracefully, then force kill
		time.AfterFunc(200*time.Millisecond, func() {
			if s.cmd.Process != nil {
				_ = s.cmd.Process.Kill()
			}
		})
	}

	if s.ptyFile != nil {
		_ = s.ptyFile.Close()
	}

	for ch := range s.subscribers {
		close(ch)
		delete(s.subscribers, ch)
	}

	return nil
}

// IsAlive returns whether the session is actively running.
func (s *Session) IsAlive() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return !s.closed
}

// SessionInfo returns metadata about the current session.
type SessionInfo struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	User        string    `json:"user"`
	Shell       string    `json:"shell"`
	Cwd         string    `json:"cwd"`
	PID         int       `json:"pid"`
	CreatedAt   time.Time `json:"created_at"`
	LastActive  time.Time `json:"last_active"`
	IsAlive     bool      `json:"is_alive"`
	ExitCode    int       `json:"exit_code"`
	Subscribers int       `json:"subscribers"`
}

// Info retrieves current snapshot metadata.
func (s *Session) Info() SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return SessionInfo{
		ID:          s.ID,
		Title:       s.Title,
		User:        s.User,
		Shell:       s.Shell,
		Cwd:         s.Cwd,
		PID:         s.PID,
		CreatedAt:   s.CreatedAt,
		LastActive:  s.LastActive,
		IsAlive:     !s.closed,
		ExitCode:    s.exitCode,
		Subscribers: len(s.subscribers),
	}
}

// GetHistory returns the complete stored buffer bytes.
func (s *Session) GetHistory() []byte {
	return s.ringBuf.Bytes()
}
