package metrics

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

// SystemMetrics contains system resource metrics
type SystemMetrics struct {
	CPU       CPUStats       `json:"cpu"`
	Memory    MemoryStats    `json:"memory"`
	Network   NetworkStats   `json:"network"`
	Disk      DiskStats      `json:"disk"`
}

// CPUStats contains CPU usage statistics
type CPUStats struct {
	User    float64 `json:"user"`
	System  float64 `json:"system"`
	Idle    float64 `json:"idle"`
	Usage   float64 `json:"usage"`
}

// MemoryStats contains memory statistics
type MemoryStats struct {
	Total     uint64  `json:"total"`
	Available uint64  `json:"available"`
	Used      uint64  `json:"used"`
	UsagePct  float64 `json:"usage_pct"`
}

// NetworkStats contains network statistics
type NetworkStats struct {
	RxBytes uint64 `json:"rx_bytes"`
	TxBytes uint64 `json:"tx_bytes"`
}

// DiskStats contains disk statistics
type DiskStats struct {
	Total     uint64  `json:"total"`
	Free      uint64  `json:"free"`
	Used      uint64  `json:"used"`
	UsagePct  float64 `json:"usage_pct"`
}

// GetSystemMetrics collects all system metrics
func GetSystemMetrics() (*SystemMetrics, error) {
	metrics := &SystemMetrics{}

	if err := readCPUStats(metrics); err != nil {
		return nil, err
	}

	if err := readMemoryStats(metrics); err != nil {
		return nil, err
	}

	if err := readNetworkStats(metrics); err != nil {
		return nil, err
	}

	return metrics, nil
}

func readCPUStats(m *SystemMetrics) error {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	if scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) >= 5 {
			user, _ := strconv.ParseFloat(fields[1], 64)
			nice, _ := strconv.ParseFloat(fields[2], 64)
			system, _ := strconv.ParseFloat(fields[3], 64)
			idle, _ := strconv.ParseFloat(fields[4], 64)

			total := user + nice + system + idle
			m.CPU.User = user / total * 100
			m.CPU.System = system / total * 100
			m.CPU.Idle = idle / total * 100
			m.CPU.Usage = (user + nice + system) / total * 100
		}
	}

	return scanner.Err()
}

func readMemoryStats(m *SystemMetrics) error {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 2 {
			continue
		}

		value, _ := strconv.ParseUint(fields[1], 10, 64)
		value *= 1024 // Convert from kB to bytes

		switch fields[0] {
		case "MemTotal:":
			m.Memory.Total = value
		case "MemAvailable:":
			m.Memory.Available = value
		}
	}

	m.Memory.Used = m.Memory.Total - m.Memory.Available
	if m.Memory.Total > 0 {
		m.Memory.UsagePct = float64(m.Memory.Used) / float64(m.Memory.Total) * 100
	}

	return scanner.Err()
}

func readNetworkStats(m *SystemMetrics) error {
	f, err := os.Open("/proc/net/dev")
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.Contains(line, ":") {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		fields := strings.Fields(parts[1])
		if len(fields) >= 9 {
			rx, _ := strconv.ParseUint(fields[0], 10, 64)
			tx, _ := strconv.ParseUint(fields[8], 10, 64)
			m.Network.RxBytes += rx
			m.Network.TxBytes += tx
		}
	}

	return scanner.Err()
}
