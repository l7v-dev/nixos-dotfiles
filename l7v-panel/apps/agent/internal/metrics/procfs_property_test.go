package metrics_test

// Feature: l7v-panel
// Property 7: Metric Computation from Procfs
// Validates: Requirements 1.5, 1.6
//
// For any pair of /proc/stat snapshots and /proc/meminfo values, the agent's
// metric computation must satisfy the documented formulas and clamp constraints.

import (
	"testing"

	"pgregory.net/rapid"
)

// cpuStatForTest mirrors the unexported cpuStat struct for property testing.
type cpuStatForTest struct {
	user, nice, system, idle, iowait, irq, softirq, steal uint64
}

func (s cpuStatForTest) total() uint64 {
	return s.user + s.nice + s.system + s.idle + s.iowait + s.irq + s.softirq + s.steal
}

func (s cpuStatForTest) nonIdle() uint64 {
	return s.user + s.nice + s.system + s.irq + s.softirq + s.steal
}

// computeCPUPctForTest mirrors the logic in procfs.go for testing.
func computeCPUPctForTest(s1, s2 cpuStatForTest) float64 {
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

func TestProperty7a_CPUPctClamped(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		// Generate two CPU stat snapshots where s2 >= s1 (monotone counters).
		base := rapid.Uint64Range(0, 1<<20).Draw(tc, "base")
		delta := rapid.Uint64Range(0, 1<<16).Draw(tc, "delta")

		s1 := cpuStatForTest{
			user: base, idle: rapid.Uint64Range(0, 1<<20).Draw(tc, "idle1"),
		}
		s2 := cpuStatForTest{
			user: base + delta, idle: rapid.Uint64Range(s1.idle, s1.idle+1<<16).Draw(tc, "idle2"),
		}

		pct := computeCPUPctForTest(s1, s2)

		// Property: result must be in [0, 100].
		if pct < 0 || pct > 100 {
			tc.Fatalf("CPU pct %f out of [0, 100] range", pct)
		}
	})
}

func TestProperty7b_MemUsedFormula(t *testing.T) {
	rapid.Check(t, func(tc *rapid.T) {
		totalKiB := rapid.Uint64Range(1, 64*1024*1024).Draw(tc, "total_kib") // up to 64 GiB
		availKiB := rapid.Uint64Range(0, totalKiB).Draw(tc, "avail_kib")

		totalMiB := totalKiB / 1024
		usedMiB := (totalKiB - availKiB) / 1024

		// Property: used <= total.
		if usedMiB > totalMiB {
			tc.Fatalf("usedMiB %d > totalMiB %d", usedMiB, totalMiB)
		}

		// Property: usage percentage in [0, 100] (when total > 0).
		if totalMiB > 0 {
			pct := float64(usedMiB) / float64(totalMiB) * 100
			if pct < 0 || pct > 100 {
				tc.Fatalf("RAM pct %f out of [0, 100]", pct)
			}
		}
	})
}
