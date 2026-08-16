package files

import (
	"context"
	"os/exec"
	"strings"
)

// GetGitInfo retrieves Git repository status if the path is inside a Git worktree.
func (c *defaultFilesClient) GetGitInfo(ctx context.Context, path string) (*GitInfo, error) {
	cleaned := cleanPath(path)

	// Check if git is available
	if _, err := exec.LookPath("git"); err != nil {
		return nil, nil
	}

	// Check if inside work tree
	checkCmd := exec.CommandContext(ctx, "git", "-C", cleaned, "rev-parse", "--is-inside-work-tree")
	if out, err := checkCmd.Output(); err != nil || strings.TrimSpace(string(out)) != "true" {
		return nil, nil
	}

	info := &GitInfo{
		IsRepo: true,
	}

	// 1. Branch
	if branchOut, err := exec.CommandContext(ctx, "git", "-C", cleaned, "branch", "--show-current").Output(); err == nil {
		info.Branch = strings.TrimSpace(string(branchOut))
	}

	// 2. Commit hash
	if commitOut, err := exec.CommandContext(ctx, "git", "-C", cleaned, "rev-parse", "--short", "HEAD").Output(); err == nil {
		info.Commit = strings.TrimSpace(string(commitOut))
	}

	// 3. Status porcelain
	if statusOut, err := exec.CommandContext(ctx, "git", "-C", cleaned, "status", "--porcelain").Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(statusOut)), "\n")
		modCount := 0
		untrackedCount := 0

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			if strings.HasPrefix(line, "??") {
				untrackedCount++
			} else {
				modCount++
			}
		}

		info.ModifiedCount = modCount
		info.UntrackedCount = untrackedCount
		info.IsDirty = (modCount + untrackedCount) > 0
	}

	return info, nil
}
