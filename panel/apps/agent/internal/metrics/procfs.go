// Package metrics reads system metrics from the Linux /proc filesystem.
package metrics

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// procfsReader is the concrete ProcfsReader implementation.
type procfsReader struct{}

// NewProcfsReader returns a ProcfsReader that reads from the live /proc filesystem.
func NewProcfsReader() ProcfsReader {
	return &procfsReader{}
}

// ReadSnapshot takes two CPU samples 1 second apart and returns a complete MetricsSnapshot.
func (p *procfsReader) ReadSnapshot(ctx context.Context) (MetricsSnapshot, error) {
	// CPU: two samples with a 1-second window.
	cpu1, err := readCPUStat()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read /proc/stat: %w", err)
	}

	select {
	case <-time.After(time.Second):
	case <-ctx.Done():
		return MetricsSnapshot{}, ctx.Err()
	}

	cpu2, err := readCPUStat()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read /proc/stat: %w", err)
	}

	cpuPct := computeCPUPct(cpu1, cpu2)

	mem, err := readMemInfo()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read /proc/meminfo: %w", err)
	}

	disks, err := readDiskStats()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read disk stats: %w", err)
	}

	net1, err := readNetDev()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read /proc/net/dev: %w", err)
	}

	select {
	case <-time.After(time.Second):
	case <-ctx.Done():
		return MetricsSnapshot{}, ctx.Err()
	}

	net2, err := readNetDev()
	if err != nil {
		return MetricsSnapshot{}, fmt.Errorf("read /proc/net/dev: %w", err)
	}

	netStats := computeNetStats(net1, net2)

	return MetricsSnapshot{
		CPU:       CPUStats{UsagePct: cpuPct},
		Memory:    mem,
		Disks:     disks,
		Network:   netStats,
		Timestamp: time.Now(),
	}, nil
}

// cpuStat holds raw /proc/stat counters for the first CPU aggregate line.
type cpuStat struct {
	user, nice, system, idle, iowait, irq, softirq, steal uint64
}

func (s cpuStat) total() uint64 {
	return s.user + s.nice + s.system + s.idle + s.iowait + s.irq + s.softirq + s.steal
}

func (s cpuStat) nonIdle() uint64 {
	return s.user + s.nice + s.system + s.irq + s.softirq + s.steal
}

// readCPUStat reads the first 'cpu' line from /proc/stat.
func readCPUStat() (cpuStat, error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return cpuStat{}, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 9 {
			return cpuStat{}, fmt.Errorf("unexpected /proc/stat format: %q", line)
		}
		var s cpuStat
		vals := []*uint64{&s.user, &s.nice, &s.system, &s.idle, &s.iowait, &s.irq, &s.softirq, &s.steal}
		for i, ptr := range vals {
			*ptr, err = strconv.ParseUint(fields[i+1], 10, 64)
			if err != nil {
				return cpuStat{}, fmt.Errorf("parse /proc/stat field %d: %w", i+1, err)
			}
		}
		return s, nil
	}
	return cpuStat{}, fmt.Errorf("/proc/stat: no 'cpu' line found")
}

// computeCPUPct computes CPU usage percentage between two samples.
// Result is clamped to [0, 100].
func computeCPUPct(s1, s2 cpuStat) float64 {
	totalDelta := float64(s2.total() - s1.total())
	if totalDelta == 0 {
		return 0
	}
	nonIdleDelta := float64(s2.nonIdle() - s1.nonIdle())
	pct := (nonIdleDelta / totalDelta) * 100
	if pct < 0 {
		return 0
	}
	if pct > 100 {
		return 100
	}
	return pct
}

// readMemInfo reads MemTotal and MemAvailable from /proc/meminfo.
func readMemInfo() (MemoryStats, error) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return MemoryStats{}, err
	}
	defer f.Close()

	var totalKiB, availKiB uint64
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		val, err := strconv.ParseUint(fields[1], 10, 64)
		if err != nil {
			continue
		}
		switch fields[0] {
		case "MemTotal:":
			totalKiB = val
		case "MemAvailable:":
			availKiB = val
		}
	}
	if totalKiB == 0 {
		return MemoryStats{}, fmt.Errorf("MemTotal not found in /proc/meminfo")
	}

	totalMiB := totalKiB / 1024
	usedMiB := (totalKiB - availKiB) / 1024
	var pct float64
	if totalMiB > 0 {
		pct = float64(usedMiB) / float64(totalMiB) * 100
	}
	return MemoryStats{
		TotalMiB: totalMiB,
		UsedMiB:  usedMiB,
		UsagePct: pct,
	}, nil
}

// allowedFSTypes are the filesystem types included in disk stats.
var allowedFSTypes = map[string]bool{
	"ext4": true, "btrfs": true, "xfs": true, "vfat": true,
}

// readDiskStats reads /proc/mounts and calls syscall.Statfs for each allowed fs.
func readDiskStats() ([]DiskStats, error) {
	f, err := os.Open("/proc/mounts")
	if err != nil {
		return nil, err
	}
	defer f.Close()

	seen := make(map[string]bool)
	var stats []DiskStats

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 3 {
			continue
		}
		mount := fields[1]
		fsType := fields[2]
		if !allowedFSTypes[fsType] || seen[mount] {
			continue
		}
		seen[mount] = true

		var s syscall.Statfs_t
		if err := syscall.Statfs(mount, &s); err != nil {
			continue // skip unreadable mounts silently
		}
		total := float64(s.Blocks) * float64(s.Bsize)
		avail := float64(s.Bavail) * float64(s.Bsize)
		used := total - float64(s.Bfree)*float64(s.Bsize)
		toGiB := 1.0 / (1024 * 1024 * 1024)
		var pct float64
		if total > 0 {
			pct = used / total * 100
		}
		stats = append(stats, DiskStats{
			Mount:    mount,
			FSType:   fsType,
			TotalGiB: total * toGiB,
			UsedGiB:  used * toGiB,
			AvailGiB: avail * toGiB,
			UsagePct: pct,
		})
	}
	if stats == nil {
		stats = []DiskStats{}
	}
	return stats, nil
}

// netSample holds raw byte counts from /proc/net/dev for a single interface.
type netSample struct {
	rxBytes, txBytes uint64
	ts               time.Time
}

// readNetDev parses /proc/net/dev and returns per-interface byte counters.
func readNetDev() (map[string]netSample, error) {
	f, err := os.Open("/proc/net/dev")
	if err != nil {
		return nil, err
	}
	defer f.Close()

	now := time.Now()
	result := make(map[string]netSample)
	scanner := bufio.NewScanner(f)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		if lineNum <= 2 { // skip header lines
			continue
		}
		line := scanner.Text()
		colonIdx := strings.Index(line, ":")
		if colonIdx < 0 {
			continue
		}
		iface := strings.TrimSpace(line[:colonIdx])
		if iface == "lo" {
			continue
		}
		fields := strings.Fields(line[colonIdx+1:])
		if len(fields) < 9 {
			continue
		}
		rxBytes, err1 := strconv.ParseUint(fields[0], 10, 64)
		txBytes, err2 := strconv.ParseUint(fields[8], 10, 64)
		if err1 != nil || err2 != nil {
			continue
		}
		result[iface] = netSample{rxBytes: rxBytes, txBytes: txBytes, ts: now}
	}
	return result, nil
}

// computeNetStats computes kBps throughput between two /proc/net/dev samples.
func computeNetStats(s1, s2 map[string]netSample) []NetStats {
	var result []NetStats
	for iface, n2 := range s2 {
		n1, ok := s1[iface]
		if !ok {
			continue
		}
		dt := n2.ts.Sub(n1.ts).Seconds()
		if dt <= 0 {
			continue
		}
		rxKBps := float64(n2.rxBytes-n1.rxBytes) / 1024 / dt
		txKBps := float64(n2.txBytes-n1.txBytes) / 1024 / dt
		result = append(result, NetStats{
			Interface: iface,
			RxKBps:    rxKBps,
			TxKBps:    txKBps,
		})
	}
	if result == nil {
		result = []NetStats{}
	}
	return result
}
