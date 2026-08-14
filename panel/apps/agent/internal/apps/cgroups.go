package apps

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type cpuSample struct {
	usageUsec uint64
	timestamp time.Time
}

// CgroupsReader collects per-unit resource telemetry from cgroups v2.
type CgroupsReader struct {
	mu        sync.Mutex
	lastCPU   map[string]cpuSample
	basePaths []string
}

// NewCgroupsReader creates a new cgroups v2 reader with standard system slice search paths.
func NewCgroupsReader() *CgroupsReader {
	return &CgroupsReader{
		lastCPU: make(map[string]cpuSample),
		basePaths: []string{
			"/sys/fs/cgroup/system.slice",
			"/sys/fs/cgroup",
		},
	}
}

// ReadUnitMetrics reads cgroups v2 metrics for a given systemd unit name.
func (r *CgroupsReader) ReadUnitMetrics(unit string) AppMetrics {
	if unit == "" {
		return AppMetrics{}
	}

	cgroupDir := r.findUnitCgroup(unit)
	if cgroupDir == "" {
		return AppMetrics{}
	}

	metrics := AppMetrics{}

	// 1. Memory usage (memory.current & memory.max)
	if memBytes, err := readUint64File(filepath.Join(cgroupDir, "memory.current")); err == nil {
		metrics.MemoryMB = memBytes / (1024 * 1024)
	}
	if memMaxBytes, err := readUint64File(filepath.Join(cgroupDir, "memory.max")); err == nil && memMaxBytes > 0 {
		metrics.MemoryLimitMB = memMaxBytes / (1024 * 1024)
	}

	// 2. Tasks / PIDs (pids.current)
	if pids, err := readUint64File(filepath.Join(cgroupDir, "pids.current")); err == nil {
		metrics.TasksCurrent = pids
	}

	// 3. CPU calculation from cpu.stat (usage_usec)
	if usageUsec, err := readCPUUsageUsec(filepath.Join(cgroupDir, "cpu.stat")); err == nil {
		r.mu.Lock()
		now := time.Now()
		if prev, ok := r.lastCPU[unit]; ok {
			timeDelta := now.Sub(prev.timestamp).Seconds()
			if timeDelta > 0 && usageUsec >= prev.usageUsec {
				usecDelta := float64(usageUsec - prev.usageUsec)
				// usage_usec is in microseconds (1 sec = 1,000,000 usec)
				cpuPct := (usecDelta / (timeDelta * 1000000.0)) * 100.0
				if cpuPct > 100.0*64.0 { // Cap to realistic max cores
					cpuPct = 0
				}
				metrics.CPUPercent = mathRound2(cpuPct)
			}
		}
		r.lastCPU[unit] = cpuSample{usageUsec: usageUsec, timestamp: now}
		r.mu.Unlock()
	}

	return metrics
}

func (r *CgroupsReader) findUnitCgroup(unit string) string {
	for _, base := range r.basePaths {
		// 1. Direct path e.g. /sys/fs/cgroup/system.slice/forgejo.service
		direct := filepath.Join(base, unit)
		if fi, err := os.Stat(direct); err == nil && fi.IsDir() {
			return direct
		}
	}
	return ""
}

func readUint64File(path string) (uint64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	s := strings.TrimSpace(string(data))
	if s == "max" || s == "" {
		return 0, nil
	}
	return strconv.ParseUint(s, 10, 64)
}

func readCPUUsageUsec(path string) (uint64, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "usage_usec ") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				return strconv.ParseUint(fields[1], 10, 64)
			}
		}
	}
	return 0, scanner.Err()
}

func mathRound2(val float64) float64 {
	return float64(int(val*100+0.5)) / 100.0
}
