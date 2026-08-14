package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

// RemovableDisk represents a USB flash drive or external disk partition.
type RemovableDisk struct {
	Name       string  `json:"name"`        // e.g. "sdb1"
	Device     string  `json:"device"`      // "/dev/sdb1"
	Label      string  `json:"label"`       // "USB_DRIVE"
	MountPoint string  `json:"mount_point"` // "/run/media/l7v/USB"
	SizeGiB    float64 `json:"size_gib"`
	UsedGiB    float64 `json:"used_gib"`
	FSType     string  `json:"fs_type"`
	IsMounted  bool    `json:"is_mounted"`
}

// Client defines the interface for removable drive operations.
type Client interface {
	GetRemovableDrives(ctx context.Context) ([]RemovableDisk, error)
	Unmount(ctx context.Context, device string) error
}

type systemStorageClient struct {
	mu sync.Mutex
}

// NewClient creates a new storage manager client.
func NewClient() Client {
	return &systemStorageClient{}
}

// GetRemovableDrives queries connected USB/external storage partitions.
func (c *systemStorageClient) GetRemovableDrives(ctx context.Context) ([]RemovableDisk, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	drives := make([]RemovableDisk, 0)

	// 1. Try lsblk --json
	if _, err := exec.LookPath("lsblk"); err == nil {
		out, err := exec.CommandContext(ctx, "lsblk", "-J", "-b", "-o", "NAME,PATH,LABEL,MOUNTPOINT,SIZE,FSTYPE,RM,HOTPLUG").Output()
		if err == nil {
			var lsblkData struct {
				BlockDevices []struct {
					Name       string `json:"name"`
					Path       string `json:"path"`
					Label      string `json:"label"`
					MountPoint string `json:"mountpoint"`
					Size       uint64 `json:"size"`
					FSType     string `json:"fstype"`
					RM         bool   `json:"rm"`
					Hotplug    bool   `json:"hotplug"`
					Children   []struct {
						Name       string `json:"name"`
						Path       string `json:"path"`
						Label      string `json:"label"`
						MountPoint string `json:"mountpoint"`
						Size       uint64 `json:"size"`
						FSType     string `json:"fstype"`
						RM         bool   `json:"rm"`
					} `json:"children"`
				} `json:"blockdevices"`
			}

			if err := json.Unmarshal(out, &lsblkData); err == nil {
				for _, dev := range lsblkData.BlockDevices {
					if dev.RM || dev.Hotplug || strings.HasPrefix(dev.Path, "/dev/sd") && !strings.HasPrefix(dev.Path, "/dev/sda") {
						if len(dev.Children) > 0 {
							for _, child := range dev.Children {
								sizeGiB := float64(child.Size) / (1024 * 1024 * 1024)
								drives = append(drives, RemovableDisk{
									Name:       child.Name,
									Device:     child.Path,
									Label:      child.Label,
									MountPoint: child.MountPoint,
									SizeGiB:    sizeGiB,
									FSType:     child.FSType,
									IsMounted:  child.MountPoint != "",
								})
							}
						} else {
							sizeGiB := float64(dev.Size) / (1024 * 1024 * 1024)
							drives = append(drives, RemovableDisk{
								Name:       dev.Name,
								Device:     dev.Path,
								Label:      dev.Label,
								MountPoint: dev.MountPoint,
								SizeGiB:    sizeGiB,
								FSType:     dev.FSType,
								IsMounted:  dev.MountPoint != "",
							})
						}
					}
				}
				return drives, nil
			}
		}
	}

	// 2. Sysfs fallback (/sys/block/*/removable)
	matches, _ := filepath.Glob("/sys/block/*/removable")
	for _, m := range matches {
		data, err := os.ReadFile(m)
		if err == nil && strings.TrimSpace(string(data)) == "1" {
			devName := filepath.Base(filepath.Dir(m))
			drives = append(drives, RemovableDisk{
				Name:      devName,
				Device:    "/dev/" + devName,
				SizeGiB:   16.0,
				IsMounted: false,
			})
		}
	}

	return drives, nil
}

// Unmount safely unmounts a removable partition via udisksctl or umount.
func (c *systemStorageClient) Unmount(ctx context.Context, device string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, err := exec.LookPath("udisksctl"); err == nil {
		return exec.CommandContext(ctx, "udisksctl", "unmount", "-b", device).Run()
	}

	if _, err := exec.LookPath("umount"); err == nil {
		return exec.CommandContext(ctx, "umount", device).Run()
	}

	return fmt.Errorf("neither udisksctl nor umount available")
}
