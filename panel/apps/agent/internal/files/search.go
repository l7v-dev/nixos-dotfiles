package files

import (
	"bufio"
	"bytes"
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// SearchFiles searches for files by name or text content within rootPath.
func (c *defaultFilesClient) SearchFiles(ctx context.Context, rootPath string, query string, isRegex bool, matchContent bool, maxDepth int, limit int) ([]SearchMatch, error) {
	cleaned := cleanPath(rootPath)
	if limit <= 0 {
		limit = 50
	} else if limit > 200 {
		limit = 200
	}

	if maxDepth <= 0 {
		maxDepth = 10
	}

	var re *regexp.Regexp
	var err error
	if isRegex {
		re, err = regexp.Compile(query)
		if err != nil {
			return nil, err
		}
	}

	lowerQuery := strings.ToLower(query)
	results := make([]SearchMatch, 0)

	baseDepth := strings.Count(cleaned, string(filepath.Separator))

	err = filepath.WalkDir(cleaned, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil // ignore inaccessible directories
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if len(results) >= limit {
			return filepath.SkipAll
		}

		currentDepth := strings.Count(path, string(filepath.Separator)) - baseDepth
		if currentDepth > maxDepth {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		name := d.Name()
		// Skip hidden folders like .git or .next
		if d.IsDir() && (name == ".git" || name == "node_modules" || name == ".next" || name == ".cache") && path != cleaned {
			return filepath.SkipDir
		}

		// 1. Match on file name
		nameMatched := false
		if isRegex {
			nameMatched = re.MatchString(name)
		} else {
			nameMatched = strings.Contains(strings.ToLower(name), lowerQuery)
		}

		info, _ := d.Info()
		var size int64
		if info != nil {
			size = info.Size()
		}

		if nameMatched {
			results = append(results, SearchMatch{
				Path:  path,
				IsDir: d.IsDir(),
				Size:  size,
			})
			return nil
		}

		// 2. Match on content if requested and not directory
		if matchContent && !d.IsDir() && size > 0 && size < 5*1024*1024 {
			matches := searchFileContent(path, query, re, isRegex, limit-len(results))
			results = append(results, matches...)
		}

		return nil
	})

	if err != nil && err != filepath.SkipAll && err != context.Canceled {
		return nil, err
	}

	return results, nil
}

func searchFileContent(filePath string, query string, re *regexp.Regexp, isRegex bool, maxMatches int) []SearchMatch {
	f, err := os.Open(filePath)
	if err != nil {
		return nil
	}
	defer f.Close()

	// Check if binary
	head := make([]byte, 512)
	n, _ := f.Read(head)
	if bytes.IndexByte(head[:n], 0) != -1 {
		return nil // skip binary files
	}
	_, _ = f.Seek(0, 0)

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 256*1024)

	matches := make([]SearchMatch, 0)
	lineNum := 0
	lowerQuery := strings.ToLower(query)

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		matched := false
		if isRegex {
			matched = re.MatchString(line)
		} else {
			matched = strings.Contains(strings.ToLower(line), lowerQuery)
		}

		if matched {
			trimmed := strings.TrimSpace(line)
			if len(trimmed) > 200 {
				trimmed = trimmed[:200] + "..."
			}
			matches = append(matches, SearchMatch{
				Path:       filePath,
				IsDir:      false,
				LineNumber: lineNum,
				LineText:   trimmed,
			})
			if len(matches) >= maxMatches {
				break
			}
		}
	}
	return matches
}
