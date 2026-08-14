package containers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"time"
)

// RawEngineStats represents the JSON payload streamed from /containers/{id}/stats.
type RawEngineStats struct {
	Read      time.Time `json:"read"`
	Preread   time.Time `json:"preread"`
	PidsStats struct {
		Current uint64 `json:"current"`
	} `json:"pids_stats"`
	BlkioStats struct {
		IOServiceBytesRecursive []struct {
			Major uint64 `json:"major"`
			Minor uint64 `json:"minor"`
			Op    string `json:"op"`
			Value uint64 `json:"value"`
		} `json:"io_service_bytes_recursive"`
	} `json:"blkio_stats"`
	CPUStats struct {
		CPUUsage struct {
			TotalUsage        uint64   `json:"total_usage"`
			PercpuUsage       []uint64 `json:"percpu_usage"`
			UsageInKernelmode uint64   `json:"usage_in_kernelmode"`
			UsageInUsermode   uint64   `json:"usage_in_usermode"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64            `json:"usage"`
		Limit uint64            `json:"limit"`
		Stats map[string]uint64 `json:"stats"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes   uint64 `json:"rx_bytes"`
		RxPackets uint64 `json:"rx_packets"`
		TxBytes   uint64 `json:"tx_bytes"`
		TxPackets uint64 `json:"tx_packets"`
	} `json:"networks"`
}

// StreamStats streams parsed ContainerStats continuously to the consumer until ctx is cancelled.
func (m *containerManager) StreamStats(ctx context.Context, id string, out chan<- ContainerStats) error {
	path := fmt.Sprintf("/containers/%s/stats?stream=1", url.PathEscape(id))

	resp, err := m.client.DoRequest(ctx, "GET", path, nil)
	if err != nil {
		return fmt.Errorf("stream stats request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("engine returned status %d for stats stream", resp.StatusCode)
	}

	decoder := json.NewDecoder(resp.Body)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		var raw RawEngineStats
		if err := decoder.Decode(&raw); err != nil {
			if err == io.EOF || ctx.Err() != nil {
				return nil
			}
			return fmt.Errorf("decode stats: %w", err)
		}

		stats := calculateContainerStats(id, raw)
		select {
		case out <- stats:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

// calculateContainerStats calculates CPU/Mem/Net/Disk metrics from raw engine JSON.
func calculateContainerStats(id string, raw RawEngineStats) ContainerStats {
	res := ContainerStats{
		ID:        id,
		Timestamp: raw.Read,
		PIDs:      raw.PidsStats.Current,
	}
	if res.Timestamp.IsZero() {
		res.Timestamp = time.Now()
	}

	// 1. Calculate CPU Percentage
	cpuDelta := float64(raw.CPUStats.CPUUsage.TotalUsage) - float64(raw.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(raw.CPUStats.SystemCPUUsage) - float64(raw.PreCPUStats.SystemCPUUsage)

	numCPUs := float64(raw.CPUStats.OnlineCPUs)
	if numCPUs == 0 {
		numCPUs = float64(len(raw.CPUStats.CPUUsage.PercpuUsage))
	}
	if numCPUs == 0 {
		numCPUs = 1.0
	}

	if systemDelta > 0 && cpuDelta > 0 {
		res.CPUPct = (cpuDelta / systemDelta) * numCPUs * 100.0
		if res.CPUPct > numCPUs*100.0 {
			res.CPUPct = numCPUs * 100.0
		}
	}

	// 2. Calculate Memory Usage and Percentage
	usedMem := raw.MemoryStats.Usage
	if cache, ok := raw.MemoryStats.Stats["inactive_file"]; ok && usedMem > cache {
		usedMem -= cache
	} else if cache, ok := raw.MemoryStats.Stats["cache"]; ok && usedMem > cache {
		usedMem -= cache
	}
	res.MemoryUsage = usedMem
	res.MemoryLimit = raw.MemoryStats.Limit
	if res.MemoryLimit > 0 {
		res.MemoryPct = (float64(res.MemoryUsage) / float64(res.MemoryLimit)) * 100.0
	}

	// 3. Network I/O summation across interfaces
	for _, netData := range raw.Networks {
		res.NetworkRxBytes += netData.RxBytes
		res.NetworkTxBytes += netData.TxBytes
	}

	// 4. Block I/O summation
	for _, blk := range raw.BlkioStats.IOServiceBytesRecursive {
		switch blk.Op {
		case "Read", "read":
			res.BlockReadBytes += blk.Value
		case "Write", "write":
			res.BlockWriteBytes += blk.Value
		}
	}

	return res
}
