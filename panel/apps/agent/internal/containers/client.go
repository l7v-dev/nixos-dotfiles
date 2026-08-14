package containers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"sync"
	"time"
)

// EngineClient provides low-level HTTP and raw Hijack communication with OCI engines over Unix sockets.
type EngineClient interface {
	Ping(ctx context.Context) (EngineType, string, string, error)
	DoRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error)
	DoJSON(ctx context.Context, method, path string, reqBody, respBody interface{}) error
	Hijack(ctx context.Context, method, path string, body io.Reader) (net.Conn, *bufio.Reader, error)
	SocketPath() string
	Engine() EngineType
	IsAvailable() bool
}

type engineClient struct {
	mu           sync.RWMutex
	socketPath   string
	httpClient   *http.Client
	engineType   EngineType
	version      string
	apiVersion   string
	available    bool
	logger       *slog.Logger
	lastCheck    time.Time
}

// CandidateSocket represents potential socket locations to probe.
type CandidateSocket struct {
	Path   string
	Engine EngineType
}

// NewEngineClient discovers and initializes an OCI engine client.
func NewEngineClient(customSocket string, logger *slog.Logger) EngineClient {
	if logger == nil {
		logger = slog.Default()
	}

	c := &engineClient{
		socketPath: customSocket,
		engineType: EngineUnknown,
		logger:     logger,
	}

	c.initClient()
	return c
}

func (c *engineClient) initClient() {
	if c.socketPath == "" {
		c.socketPath = c.discoverSocket()
	}

	if c.socketPath == "" {
		c.logger.Warn("no container engine socket found (Podman or Docker)")
		c.available = false
		return
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			var d net.Dialer
			return d.DialContext(ctx, "unix", c.socketPath)
		},
		DisableCompression: true,
		MaxIdleConns:        20,
		IdleConnTimeout:     90 * time.Second,
	}

	c.httpClient = &http.Client{
		Transport: transport,
		Timeout:   0, // Long-running streams (logs, stats) handle their own context timeouts
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	engine, ver, apiVer, err := c.Ping(ctx)
	if err != nil {
		c.logger.Warn("container engine ping failed", "socket", c.socketPath, "err", err)
		c.available = false
	} else {
		c.engineType = engine
		c.version = ver
		c.apiVersion = apiVer
		c.available = true
		c.logger.Info("connected to container engine", "engine", engine, "version", ver, "api", apiVer, "socket", c.socketPath)
	}
}

func (c *engineClient) discoverSocket() string {
	// 1. Check environment variable
	if envSock := os.Getenv("PANEL_CONTAINER_SOCKET"); envSock != "" {
		if _, err := os.Stat(envSock); err == nil {
			return envSock
		}
	}

	uid := os.Getuid()
	candidates := []CandidateSocket{
		{Path: "/run/podman/podman.sock", Engine: EnginePodman},
		{Path: fmt.Sprintf("/run/user/%d/podman/podman.sock", uid), Engine: EnginePodman},
		{Path: "/run/docker.sock", Engine: EngineDocker},
		{Path: "/var/run/docker.sock", Engine: EngineDocker},
	}

	for _, cand := range candidates {
		if info, err := os.Stat(cand.Path); err == nil {
			// Ensure it is a socket or accessible path
			if info.Mode()&os.ModeSocket != 0 || info.Mode().IsRegular() || info.IsDir() == false {
				return cand.Path
			}
		}
	}

	return ""
}

// Ping checks engine health and identifies Podman vs Docker version.
func (c *engineClient) Ping(ctx context.Context) (EngineType, string, string, error) {
	if c.socketPath == "" {
		c.socketPath = c.discoverSocket()
		if c.socketPath == "" {
			return EngineUnknown, "", "", errors.New("container socket unavailable")
		}
		c.initClient()
	}

	// 1. Check /_ping
	req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost/_ping", nil)
	if err != nil {
		return EngineUnknown, "", "", err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return EngineUnknown, "", "", fmt.Errorf("ping failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return EngineUnknown, "", "", fmt.Errorf("ping returned status %d", resp.StatusCode)
	}

	// 2. Fetch /version to determine engine metadata
	var versionData struct {
		Version       string `json:"Version"`
		APIVersion    string `json:"ApiVersion"`
		MinAPIVersion string `json:"MinAPIVersion"`
		GitCommit     string `json:"GitCommit"`
		GoVersion     string `json:"GoVersion"`
		Os            string `json:"Os"`
		Arch          string `json:"Arch"`
		Components    []struct {
			Name    string                 `json:"Name"`
			Version string                 `json:"Version"`
			Details map[string]interface{} `json:"Details"`
		} `json:"Components"`
	}

	if err := c.DoJSON(ctx, "GET", "/version", nil, &versionData); err == nil {
		engine := EngineDocker
		// Look for Podman signatures in components or version string
		if strings.Contains(strings.ToLower(versionData.Version), "podman") ||
			strings.Contains(strings.ToLower(c.socketPath), "podman") {
			engine = EnginePodman
		}
		for _, comp := range versionData.Components {
			if strings.Contains(strings.ToLower(comp.Name), "podman") {
				engine = EnginePodman
				break
			}
		}
		return engine, versionData.Version, versionData.APIVersion, nil
	}

	return EngineDocker, "unknown", "1.40", nil
}

// DoRequest performs an HTTP request over the Unix domain socket.
func (c *engineClient) DoRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	if c.httpClient == nil {
		c.initClient()
		if c.httpClient == nil {
			return nil, errors.New("engine client not initialized")
		}
	}

	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	reqURL := "http://localhost" + path
	req, err := http.NewRequestWithContext(ctx, method, reqURL, body)
	if err != nil {
		return nil, err
	}

	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

// DoJSON is a helper that encodes reqBody to JSON, performs request, and decodes respBody.
func (c *engineClient) DoJSON(ctx context.Context, method, path string, reqBody, respBody interface{}) error {
	var bodyReader io.Reader
	if reqBody != nil {
		buf, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(buf)
	}

	resp, err := c.DoRequest(ctx, method, path, bodyReader)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		var errObj struct {
			Message string `json:"message"`
		}
		if json.Unmarshal(bodyBytes, &errObj) == nil && errObj.Message != "" {
			return fmt.Errorf("engine error (%d): %s", resp.StatusCode, errObj.Message)
		}
		return fmt.Errorf("engine returned HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	if respBody != nil {
		if err := json.NewDecoder(resp.Body).Decode(respBody); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}

	return nil
}

// Hijack opens a raw bidirectional stream over the Unix domain socket for interactive exec / attach.
func (c *engineClient) Hijack(ctx context.Context, method, path string, body io.Reader) (net.Conn, *bufio.Reader, error) {
	if c.socketPath == "" {
		return nil, nil, errors.New("socket path not configured")
	}

	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "unix", c.socketPath)
	if err != nil {
		return nil, nil, fmt.Errorf("dial unix socket: %w", err)
	}

	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	req, err := http.NewRequestWithContext(ctx, method, "http://localhost"+path, body)
	if err != nil {
		conn.Close()
		return nil, nil, err
	}

	req.Header.Set("User-Agent", "l7v-panel-agent")
	req.Header.Set("Connection", "Upgrade")
	req.Header.Set("Upgrade", "tcp")
	req.Header.Set("Content-Type", "application/json")

	// Send HTTP request over raw connection
	clientConn := httputil.NewClientConn(conn, nil)
	_, err = clientConn.Do(req)
	if err != nil && !errors.Is(err, httputil.ErrPersistEOF) {
		clientConn.Close()
		return nil, nil, fmt.Errorf("hijack request failed: %w", err)
	}

	rawConn, r := clientConn.Hijack()
	return rawConn, r, nil
}

func (c *engineClient) SocketPath() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.socketPath
}

func (c *engineClient) Engine() EngineType {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.engineType
}

func (c *engineClient) IsAvailable() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.available
}
