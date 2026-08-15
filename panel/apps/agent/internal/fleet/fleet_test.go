package fleet

import (
	"context"
	"testing"
	"time"
)

func TestFleetNodesTopology(t *testing.T) {
	client := NewClient()

	nodes, err := client.ListNodes(context.Background())
	if err != nil {
		t.Fatalf("ListNodes failed: %v", err)
	}

	if len(nodes) != 4 {
		t.Fatalf("expected 4 fleet nodes (laptop, server, builder, backup), got %d", len(nodes))
	}

	// Verify laptop is marked as local
	var laptop *Node
	for i := range nodes {
		if nodes[i].ID == "laptop" {
			laptop = &nodes[i]
			break
		}
	}

	if laptop == nil {
		t.Fatal("laptop node not found")
	}
	if !laptop.IsLocal || laptop.Status != "local" {
		t.Errorf("laptop should be local, got isLocal=%v status=%s", laptop.IsLocal, laptop.Status)
	}

	summary, err := client.GetFleetStatus(context.Background())
	if err != nil {
		t.Fatalf("GetFleetStatus failed: %v", err)
	}

	if summary.TotalNodes != 4 {
		t.Errorf("expected 4 total nodes, got %d", summary.TotalNodes)
	}
	if summary.OnlineNodes < 1 {
		t.Errorf("expected at least 1 online node (local), got %d", summary.OnlineNodes)
	}
}

func TestColmenaJobSubscription(t *testing.T) {
	mgr := NewColmenaManager()

	job := &ColmenaDeployJob{
		ID:          "deploy-test-1",
		Target:      "@production",
		Action:      "apply",
		Status:      "running",
		Logs:        []string{"[INFO] Initializing hive", "[INFO] Connecting to targets"},
		subscribers: make(map[chan string]struct{}),
	}

	mgr.jobs["deploy-test-1"] = job
	mgr.list = append(mgr.list, job)

	j, ok := mgr.GetJob("deploy-test-1")
	if !ok || j.Target != "@production" {
		t.Fatalf("GetJob failed")
	}

	ch, unsub := j.Subscribe()
	defer unsub()

	select {
	case l := <-ch:
		if l != "[INFO] Initializing hive" {
			t.Errorf("expected initial log line, got %s", l)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for initial backlog")
	}

	go j.appendAndBroadcast("[SUCCESS] Target server activated")

	select {
	case l := <-ch:
		if l != "[INFO] Connecting to targets" && l != "[SUCCESS] Target server activated" {
			t.Errorf("unexpected broadcast message: %s", l)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for broadcast message")
	}
}
