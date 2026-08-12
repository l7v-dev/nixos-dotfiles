package metrics

import "time"

// Thresholds defines warn/crit percentage thresholds for each metric type.
// Values are populated from environment variables by main.go.
type Thresholds struct {
	CPUWarnPct  int
	CPUCritPct  int
	RAMWarnPct  int
	RAMCritPct  int
	DiskWarnPct int
	DiskCritPct int
}

// CPUStats holds current CPU utilisation.
type CPUStats struct {
	UsagePct float64 `json:"usage_pct"`
}

// MemoryStats holds current RAM utilisation.
type MemoryStats struct {
	TotalMiB uint64  `json:"total_mib"`
	UsedMiB  uint64  `json:"used_mib"`
	UsagePct float64 `json:"usage_pct"`
}

// DiskStats holds utilisation for a single mounted filesystem.
type DiskStats struct {
	Mount    string  `json:"mount"`
	FSType   string  `json:"fs_type"`
	TotalGiB float64 `json:"total_gib"`
	UsedGiB  float64 `json:"used_gib"`
	AvailGiB float64 `json:"avail_gib"`
	UsagePct float64 `json:"usage_pct"`
}

// NetStats holds throughput for a single network interface.
type NetStats struct {
	Interface string  `json:"interface"`
	RxKBps    float64 `json:"rx_kbps"`
	TxKBps    float64 `json:"tx_kbps"`
}

// MetricsSnapshot is the complete metrics payload returned by GET /api/v1/metrics.
type MetricsSnapshot struct {
	CPU        CPUStats    `json:"cpu"`
	Memory     MemoryStats `json:"memory"`
	Disks      []DiskStats `json:"disks"`
	Network    []NetStats  `json:"network"`
	Timestamp  time.Time   `json:"timestamp"`
	Thresholds Thresholds  `json:"thresholds"`
}
