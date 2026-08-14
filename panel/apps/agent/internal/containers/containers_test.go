package containers

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type mockEngineClient struct {
	server    *httptest.Server
	engine    EngineType
	version   string
	apiVer    string
	available bool
}

func newMockEngineClient(handler http.HandlerFunc) *mockEngineClient {
	ts := httptest.NewServer(handler)
	return &mockEngineClient{
		server:    ts,
		engine:    EnginePodman,
		version:   "5.0.0",
		apiVer:    "1.45",
		available: true,
	}
}

func (m *mockEngineClient) Ping(ctx context.Context) (EngineType, string, string, error) {
	return m.engine, m.version, m.apiVer, nil
}

func (m *mockEngineClient) DoRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, m.server.URL+path, body)
	if err != nil {
		return nil, err
	}
	return http.DefaultClient.Do(req)
}

func (m *mockEngineClient) DoJSON(ctx context.Context, method, path string, reqBody, respBody interface{}) error {
	var r io.Reader
	if reqBody != nil {
		b, _ := json.Marshal(reqBody)
		r = bytes.NewReader(b)
	}
	resp, err := m.DoRequest(ctx, method, path, r)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if respBody != nil {
		return json.NewDecoder(resp.Body).Decode(respBody)
	}
	return nil
}

func (m *mockEngineClient) Hijack(ctx context.Context, method, path string, body io.Reader) (net.Conn, *bufio.Reader, error) {
	return nil, nil, nil
}

func (m *mockEngineClient) SocketPath() string { return "/run/podman/podman.sock" }
func (m *mockEngineClient) Engine() EngineType  { return m.engine }
func (m *mockEngineClient) IsAvailable() bool  { return m.available }

func TestListContainersAndDeclarative(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/containers/json") {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`[
				{
					"Id": "c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
					"Names": ["/web-app"],
					"Image": "nginx:alpine",
					"ImageID": "sha256:123456",
					"Command": "nginx -g 'daemon off;'",
					"Created": 1700000000,
					"State": "running",
					"Status": "Up 2 hours",
					"Ports": [{"PrivatePort": 80, "PublicPort": 8080, "Type": "tcp"}],
					"Labels": {"com.docker.compose.project": "my-stack"},
					"Mounts": [{"Type": "volume", "Name": "web-data", "Source": "/var/lib/docker/volumes/web-data/_data", "Destination": "/usr/share/nginx/html", "RW": true}]
				},
				{
					"Id": "f9e8d7c6b5a41234567890abcdef1234",
					"Names": ["/podman-vaultwarden"],
					"Image": "vaultwarden/server:latest",
					"State": "running",
					"Status": "Up 5 days",
					"Labels": {"nixos.declarative": "true"},
					"Mounts": []
				}
			]`))
			return
		}
		http.NotFound(w, r)
	}

	client := newMockEngineClient(handler)
	defer client.server.Close()

	mgr := &containerManager{client: client, logger: nil}
	ctx := context.Background()

	containers, err := mgr.ListContainers(ctx, true, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(containers) != 2 {
		t.Fatalf("expected 2 containers, got %d", len(containers))
	}

	// First container: Compose project
	c1 := containers[0]
	if c1.Names[0] != "web-app" {
		t.Errorf("expected name web-app, got %s", c1.Names[0])
	}
	if c1.Stack != "my-stack" {
		t.Errorf("expected stack my-stack, got %s", c1.Stack)
	}
	if c1.IsNixOS {
		t.Errorf("c1 should not be declarative NixOS")
	}
	if len(c1.Ports) != 1 || c1.Ports[0].PublicPort != 8080 {
		t.Errorf("unexpected ports: %+v", c1.Ports)
	}

	// Second container: Declarative NixOS
	c2 := containers[1]
	if !c2.IsNixOS {
		t.Errorf("c2 should be declarative NixOS")
	}
}

func TestContainerLifecycleActions(t *testing.T) {
	called := make(map[string]bool)

	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		called[r.Method+" "+r.URL.Path] = true
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{}`))
	}

	client := newMockEngineClient(handler)
	defer client.server.Close()

	mgr := &containerManager{client: client, logger: nil}
	ctx := context.Background()

	if err := mgr.StartContainer(ctx, "c1"); err != nil {
		t.Errorf("start failed: %v", err)
	}
	if !called["POST /containers/c1/start"] {
		t.Errorf("start endpoint not called")
	}

	if err := mgr.StopContainer(ctx, "c1", 5); err != nil {
		t.Errorf("stop failed: %v", err)
	}
	if !called["POST /containers/c1/stop"] {
		t.Errorf("stop endpoint not called")
	}

	if err := mgr.RestartContainer(ctx, "c1", 5); err != nil {
		t.Errorf("restart failed: %v", err)
	}

	if err := mgr.PauseContainer(ctx, "c1"); err != nil {
		t.Errorf("pause failed: %v", err)
	}

	if err := mgr.UnpauseContainer(ctx, "c1"); err != nil {
		t.Errorf("unpause failed: %v", err)
	}

	if err := mgr.KillContainer(ctx, "c1", "SIGKILL"); err != nil {
		t.Errorf("kill failed: %v", err)
	}

	if err := mgr.RemoveContainer(ctx, "c1", true, true); err != nil {
		t.Errorf("remove failed: %v", err)
	}
}

func TestStatsCalculation(t *testing.T) {
	var raw RawEngineStats
	raw.Read = time.Now()
	raw.CPUStats.CPUUsage.TotalUsage = 200000000
	raw.PreCPUStats.CPUUsage.TotalUsage = 100000000
	raw.CPUStats.SystemCPUUsage = 2000000000
	raw.PreCPUStats.SystemCPUUsage = 1000000000
	raw.CPUStats.OnlineCPUs = 4

	raw.MemoryStats.Usage = 150 * 1024 * 1024
	raw.MemoryStats.Limit = 1024 * 1024 * 1024
	raw.MemoryStats.Stats = map[string]uint64{
		"inactive_file": 50 * 1024 * 1024,
	}

	stats := calculateContainerStats("test-container", raw)

	// CPU % = (100000000 / 1000000000) * 4 * 100 = 40.0%
	if stats.CPUPct < 39.9 || stats.CPUPct > 40.1 {
		t.Errorf("expected CPU ~40%%, got %f", stats.CPUPct)
	}

	// Memory Usage = 150MB - 50MB inactive cache = 100MB
	expectedMem := uint64(100 * 1024 * 1024)
	if stats.MemoryUsage != expectedMem {
		t.Errorf("expected memory %d, got %d", expectedMem, stats.MemoryUsage)
	}
}

func TestDemuxLogsStream(t *testing.T) {
	var buf bytes.Buffer

	// Build 8-byte header for stdout: "hello from stdout\n"
	stdoutMsg := []byte("hello from stdout\n")
	h1 := make([]byte, 8)
	h1[0] = 1 // stdout
	binary.BigEndian.PutUint32(h1[4:8], uint32(len(stdoutMsg)))
	buf.Write(h1)
	buf.Write(stdoutMsg)

	// Build 8-byte header for stderr: "error from stderr\n"
	stderrMsg := []byte("error from stderr\n")
	h2 := make([]byte, 8)
	h2[0] = 2 // stderr
	binary.BigEndian.PutUint32(h2[4:8], uint32(len(stderrMsg)))
	buf.Write(h2)
	buf.Write(stderrMsg)

	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Write(buf.Bytes())
	}

	client := newMockEngineClient(handler)
	defer client.server.Close()

	mgr := &containerManager{client: client, logger: nil}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	out := make(chan LogLine, 10)
	go func() {
		_ = mgr.StreamLogs(ctx, "c1", LogStreamOptions{Follow: false, Tail: "10"}, out)
		close(out)
	}()

	var received []LogLine
	for l := range out {
		received = append(received, l)
	}

	if len(received) != 2 {
		t.Fatalf("expected 2 log lines, got %d", len(received))
	}

	if received[0].Stream != "stdout" || received[0].Message != "hello from stdout" {
		t.Errorf("unexpected line 0: %+v", received[0])
	}
	if received[1].Stream != "stderr" || received[1].Message != "error from stderr" {
		t.Errorf("unexpected line 1: %+v", received[1])
	}
}

func TestVolumesAndNetworks(t *testing.T) {
	handler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/volumes" {
			w.Write([]byte(`{"Volumes":[{"Name":"my-vol","Driver":"local","Mountpoint":"/data"}]}`))
			return
		}
		if r.URL.Path == "/containers/json" {
			w.Write([]byte(`[]`))
			return
		}
		if r.URL.Path == "/networks" {
			w.Write([]byte(`[{"Id":"n1","Name":"my-net","Driver":"bridge","Scope":"local"}]`))
			return
		}
		http.NotFound(w, r)
	}

	client := newMockEngineClient(handler)
	defer client.server.Close()

	mgr := &containerManager{client: client, logger: nil}
	ctx := context.Background()

	vols, err := mgr.ListVolumes(ctx)
	if err != nil || len(vols) != 1 || vols[0].Name != "my-vol" {
		t.Errorf("list volumes failed: %v, vols: %+v", err, vols)
	}

	nets, err := mgr.ListNetworks(ctx)
	if err != nil || len(nets) != 1 || nets[0].Name != "my-net" {
		t.Errorf("list networks failed: %v, nets: %+v", err, nets)
	}
}
