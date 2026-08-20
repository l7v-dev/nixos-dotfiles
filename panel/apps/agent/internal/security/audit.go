package security

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// ExposureType classifies whether a listening port is internal, mesh VPN, or publicly open.
type ExposureType string

const (
	ExposureLocalhost ExposureType = "localhost" // 127.0.0.1, ::1
	ExposureMesh      ExposureType = "mesh"      // 100.64.*.* (Tailscale CGNAT)
	ExposurePublic    ExposureType = "public"    // 0.0.0.0, ::
)

// PortAuditItem represents a listening port with process mapping and exposure level.
type PortAuditItem struct {
	Protocol    string       `json:"protocol"` // "tcp", "udp", "tcp6", "udp6"
	Port        int          `json:"port"`
	Address     string       `json:"address"`
	Process     string       `json:"process,omitempty"`
	PID         int          `json:"pid,omitempty"`
	Exposure    ExposureType `json:"exposure"`
	IsProtected bool         `json:"is_protected"`
}

// SOPSAuditReport represents the validation state of Age keys and SOPS secrets.
type SOPSAuditReport struct {
	KeyFileExists    bool      `json:"key_file_exists"`
	KeyFilePath      string    `json:"key_file_path"`
	PublicKey        string    `json:"public_key,omitempty"`
	RegisteredInSops bool      `json:"registered_in_sops"`
	DecryptionOk     bool      `json:"decryption_ok"`
	StatusMessage    string    `json:"status_message"`
	LastTestedAt     time.Time `json:"last_tested_at"`
}

// SecretMetadata represents a declared SOPS secret in secrets.yaml.
type SecretMetadata struct {
	Key           string    `json:"key"`
	Category      string    `json:"category"`
	AssociatedApp string    `json:"associated_app,omitempty"`
	Encrypted     bool      `json:"encrypted"`
	LastModified  time.Time `json:"last_modified,omitempty"`
}

// Fail2banJailInfo represents an active intrusion prevention jail.
type Fail2banJailInfo struct {
	Name            string   `json:"name"`
	CurrentlyBanned int      `json:"currently_banned"`
	TotalBanned     int      `json:"total_banned"`
	BannedIPs       []string `json:"banned_ips"`
}

// Fail2banStatus represents fail2ban daemon status.
type Fail2banStatus struct {
	Enabled       bool               `json:"enabled"`
	ActiveJails   int                `json:"active_jails"`
	TotalBannedIP int                `json:"total_banned_ip"`
	Jails         []Fail2banJailInfo `json:"jails"`
}

// SecurityAuditReport represents the overall system security health and score.
type SecurityAuditReport struct {
	Score           int             `json:"score"` // 0 - 100
	Grade           string          `json:"grade"` // "A+", "A", "B", "C", "F"
	FirewallActive  bool            `json:"firewall_active"`
	VPNActive       bool            `json:"vpn_active"`
	SOPSReport      SOPSAuditReport `json:"sops_report"`
	Fail2ban        Fail2banStatus  `json:"fail2ban"`
	OpenPorts       []PortAuditItem `json:"open_ports"`
	TotalListening  int             `json:"total_listening"`
	PublicListening int             `json:"public_listening"`
	SysctlHardened  bool            `json:"sysctl_hardened"`
	Recommendations []string        `json:"recommendations"`
	AuditedAt       time.Time       `json:"audited_at"`
}

// CheckSOPSIntegrity verifies /etc/age/key, .sops.yaml, and optionally tests decryption.
func CheckSOPSIntegrity(ctx context.Context, flakeRoot string, testDecrypt bool) SOPSAuditReport {
	keyPath := "/etc/age/key"
	report := SOPSAuditReport{
		KeyFilePath:  keyPath,
		LastTestedAt: time.Now(),
	}

	// 1. Key file verification
	data, err := os.ReadFile(keyPath)
	if err != nil {
		report.KeyFileExists = false
		report.DecryptionOk = false
		report.RegisteredInSops = false
		report.StatusMessage = "Age anahtar dosyası (/etc/age/key) bulunamadı. `sudo ./scripts/bootstrap.sh` çalıştırın."
		return report
	}
	report.KeyFileExists = true

	// 2. Extract public key from comment line: "# public key: age1..."
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# public key: ") {
			report.PublicKey = strings.TrimPrefix(line, "# public key: ")
			break
		}
	}

	if report.PublicKey == "" {
		report.DecryptionOk = false
		report.RegisteredInSops = false
		report.StatusMessage = "/etc/age/key içinde public key başlığı bulunamadı."
		return report
	}

	// 3. Check .sops.yaml registration
	sopsYamlPath := filepath.Join(flakeRoot, "secrets", "sops", ".sops.yaml")
	if sopsData, sErr := os.ReadFile(sopsYamlPath); sErr == nil {
		if strings.Contains(string(sopsData), report.PublicKey) {
			report.RegisteredInSops = true
		} else {
			report.RegisteredInSops = false
			prefix := report.PublicKey
			if len(prefix) > 12 {
				prefix = prefix[:12] + "..."
			}
			report.StatusMessage = fmt.Sprintf("Public key (%s) .sops.yaml içinde kayıtlı değil.", prefix)
		}
	} else {
		report.RegisteredInSops = false
		report.StatusMessage = fmt.Sprintf(".sops.yaml okunamadı (%s): %v", sopsYamlPath, sErr)
	}

	// 4. Test decryption if requested
	secretsPath := filepath.Join(flakeRoot, "secrets", "sops", "secrets.yaml")
	if testDecrypt && report.KeyFileExists {
		if _, statErr := os.Stat(secretsPath); statErr == nil {
			cmd := exec.CommandContext(ctx, "sops", "--decrypt", secretsPath)
			cmd.Env = append(os.Environ(), "SOPS_AGE_KEY_FILE="+keyPath)
			if out, dErr := cmd.CombinedOutput(); dErr == nil {
				report.DecryptionOk = true
				report.StatusMessage = "SOPS şifreleme ve Age anahtar eşleşmesi doğrulandı (OK)."
			} else {
				report.DecryptionOk = false
				outStr := strings.TrimSpace(string(out))
				if outStr != "" {
					report.StatusMessage = fmt.Sprintf("secrets.yaml şifresi çözülemedi: %s", outStr)
				} else {
					report.StatusMessage = "secrets.yaml şifresi çözülemedi. `sops updatekeys secrets/sops/secrets.yaml` çalıştırın."
				}
			}
		} else {
			report.DecryptionOk = false
			report.StatusMessage = fmt.Sprintf("secrets.yaml dosyası bulunamadı (%s)", secretsPath)
		}
	} else if report.KeyFileExists && report.RegisteredInSops {
		report.DecryptionOk = false
		report.StatusMessage = "Age anahtarı ve .sops.yaml kaydı mevcut (Doğrulama testi henüz çalıştırılmadı)."
	}

	return report
}

// GetSOPSSecretsSummary parses secrets.yaml and returns declared secret metadata without exposing plaintext.
func GetSOPSSecretsSummary(flakeRoot string) ([]SecretMetadata, error) {
	secretsPath := filepath.Join(flakeRoot, "secrets", "sops", "secrets.yaml")
	data, err := os.ReadFile(secretsPath)
	if err != nil {
		return nil, fmt.Errorf("secrets.yaml okunamadı (%s): %w", secretsPath, err)
	}

	var secrets []SecretMetadata
	var lastModified time.Time

	// App mapping heuristics
	appMap := map[string]string{
		"forgejo":     "forgejo",
		"vaultwarden": "vaultwarden",
		"backup":      "restic",
		"ci":          "buildkite-agent",
		"database":    "postgresql",
		"cache":       "nix-serve",
		"matrix":      "conduit",
		"grafana":     "grafana",
		"ntfy":        "ntfy",
		"cloudflare":  "cloudflared",
		"tailscale":   "tailscale",
	}

	lines := strings.Split(string(data), "\n")
	inSopsBlock := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		if strings.HasPrefix(trimmed, "sops:") {
			inSopsBlock = true
			continue
		}

		if inSopsBlock {
			if strings.HasPrefix(trimmed, "lastmodified:") {
				parts := strings.SplitN(trimmed, ":", 2)
				if len(parts) == 2 {
					val := strings.Trim(strings.TrimSpace(parts[1]), "\"")
					if t, parseErr := time.Parse(time.RFC3339, val); parseErr == nil {
						lastModified = t
					}
				}
			}
			continue
		}

		// Top-level secret keys: e.g. "backup/restic_password: ENC[AES256_GCM,...]"
		if strings.Contains(trimmed, ":") {
			parts := strings.SplitN(trimmed, ":", 2)
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])

			category := "general"
			if slashIdx := strings.Index(key, "/"); slashIdx != -1 {
				category = key[:slashIdx]
			}

			assocApp := appMap[category]

			secrets = append(secrets, SecretMetadata{
				Key:           key,
				Category:      category,
				AssociatedApp: assocApp,
				Encrypted:     strings.Contains(val, "ENC["),
			})
		}
	}

	for i := range secrets {
		secrets[i].LastModified = lastModified
	}

	return secrets, nil
}

// GetFail2banStatus queries fail2ban-client for active jails and banned IPs.
func GetFail2banStatus(ctx context.Context) Fail2banStatus {
	st := Fail2banStatus{
		Enabled:     false,
		ActiveJails: 0,
		Jails:       make([]Fail2banJailInfo, 0),
	}

	if _, err := exec.LookPath("fail2ban-client"); err != nil {
		return st
	}

	// Check status
	out, err := exec.CommandContext(ctx, "fail2ban-client", "status").Output()
	if err != nil {
		return st
	}

	st.Enabled = true
	outStr := string(out)

	// Parse jail list: e.g. "Jail list: sshd, nginx-http-auth"
	jailListPrefix := "Jail list:"
	idx := strings.Index(outStr, jailListPrefix)
	if idx == -1 {
		return st
	}

	jailsPart := strings.TrimSpace(outStr[idx+len(jailListPrefix):])
	jails := strings.Split(jailsPart, ",")

	for _, j := range jails {
		j = strings.TrimSpace(j)
		if j == "" {
			continue
		}

		jailInfo := Fail2banJailInfo{
			Name:      j,
			BannedIPs: make([]string, 0),
		}

		// Query jail details: fail2ban-client status <jail>
		jOut, jErr := exec.CommandContext(ctx, "fail2ban-client", "status", j).Output()
		if jErr == nil {
			jStr := string(jOut)
			scanner := bufio.NewScanner(strings.NewReader(jStr))
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if strings.Contains(line, "Currently banned:") {
					parts := strings.Fields(line)
					if len(parts) >= 3 {
						c, _ := strconv.Atoi(parts[len(parts)-1])
						jailInfo.CurrentlyBanned = c
						st.TotalBannedIP += c
					}
				} else if strings.Contains(line, "Total banned:") {
					parts := strings.Fields(line)
					if len(parts) >= 3 {
						c, _ := strconv.Atoi(parts[len(parts)-1])
						jailInfo.TotalBanned = c
					}
				} else if strings.Contains(line, "Banned IP list:") {
					ipIdx := strings.Index(line, "Banned IP list:")
					if ipIdx != -1 {
						ips := strings.Fields(line[ipIdx+15:])
						jailInfo.BannedIPs = ips
					}
				}
			}
		}

		st.Jails = append(st.Jails, jailInfo)
	}

	st.ActiveJails = len(st.Jails)
	return st
}

// UnbanFail2banIP unbans a specific IP from a jail.
func UnbanFail2banIP(ctx context.Context, jail string, ip string) error {
	if jail == "" || ip == "" {
		return fmt.Errorf("jail ve ip parametreleri zorunludur")
	}

	if _, err := exec.LookPath("fail2ban-client"); err != nil {
		return fmt.Errorf("fail2ban-client bulunamadı")
	}

	cmd := exec.CommandContext(ctx, "fail2ban-client", "set", jail, "unbanip", ip)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("unban işlemi başarısız (%s): %w", strings.TrimSpace(string(out)), err)
	}
	return nil
}

// BanFail2banIP bans a specific IP in a jail manually.
func BanFail2banIP(ctx context.Context, jail string, ip string) error {
	if jail == "" || ip == "" {
		return fmt.Errorf("jail ve ip parametreleri zorunludur")
	}

	if _, err := exec.LookPath("fail2ban-client"); err != nil {
		return fmt.Errorf("fail2ban-client bulunamadı")
	}

	cmd := exec.CommandContext(ctx, "fail2ban-client", "set", jail, "banip", ip)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ban işlemi başarısız (%s): %w", strings.TrimSpace(string(out)), err)
	}
	return nil
}

// CheckSysctlHardened inspects key kernel security sysctl parameters.
func CheckSysctlHardened() bool {
	checkFile := func(path string, expectedVal string) bool {
		data, err := os.ReadFile(path)
		if err != nil {
			return false
		}
		return strings.TrimSpace(string(data)) == expectedVal
	}

	// rp_filter (anti-spoofing)
	rp1 := checkFile("/proc/sys/net/ipv4/conf/all/rp_filter", "1")
	rp2 := checkFile("/proc/sys/net/ipv4/conf/all/rp_filter", "2")
	if !rp1 && !rp2 {
		return false
	}

	// tcp_syncookies (syn flood protection)
	if !checkFile("/proc/sys/net/ipv4/tcp_syncookies", "1") {
		return false
	}

	return true
}

// CheckFirewallActive checks if NixOS firewall / iptables / nftables is actively running.
func CheckFirewallActive(ctx context.Context) bool {
	// 1. Check systemd firewall service
	if _, err := exec.LookPath("systemctl"); err == nil {
		cmd := exec.CommandContext(ctx, "systemctl", "is-active", "firewall")
		if err := cmd.Run(); err == nil {
			return true
		}
	}

	// 2. Fallback check: iptables rules
	if _, err := exec.LookPath("iptables"); err == nil {
		cmd := exec.CommandContext(ctx, "iptables", "-S")
		if out, err := cmd.Output(); err == nil && len(out) > 0 {
			return true
		}
	}

	// 3. Fallback check: nftables rules
	if _, err := exec.LookPath("nft"); err == nil {
		cmd := exec.CommandContext(ctx, "nft", "list", "ruleset")
		if out, err := cmd.Output(); err == nil && len(out) > 0 {
			return true
		}
	}

	return false
}

// ListDetailedPorts inspects /proc/net/{tcp,tcp6,udp,udp6} and maps processes and exposure levels.
func ListDetailedPorts(ctx context.Context) []PortAuditItem {
	ports := make([]PortAuditItem, 0)
	seen := make(map[string]bool)

	// Build inode to PID/Process mapping from /proc
	inodeMap := buildSocketInodeMap()

	parseProc := func(path string, proto string) {
		data, err := os.ReadFile(path)
		if err != nil {
			return
		}

		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if i == 0 {
				continue
			}
			fields := strings.Fields(line)
			if len(fields) < 10 {
				continue
			}

			// For TCP: 0A = TCP_LISTEN. For UDP: 07 = UDP_LISTEN or any bound socket
			state := fields[3]
			if strings.HasPrefix(proto, "tcp") && state != "0A" {
				continue
			}

			localAddr := fields[1]
			parts := strings.Split(localAddr, ":")
			if len(parts) != 2 {
				continue
			}

			portHex := parts[1]
			portNum, pErr := strconv.ParseInt(portHex, 16, 64)
			if pErr != nil || portNum <= 0 {
				continue
			}

			ipHex := parts[0]
			ipStr, exposure := parseHexIP(ipHex, proto)

			key := fmt.Sprintf("%s-%s-%d", proto, ipStr, portNum)
			if seen[key] {
				continue
			}
			seen[key] = true

			inode := fields[9]
			procName := ""
			pid := 0

			if info, exists := inodeMap[inode]; exists {
				procName = info.name
				pid = info.pid
			}
			if procName == "" {
				procName = mapPortToProcess(int(portNum))
			}

			item := PortAuditItem{
				Protocol:    proto,
				Port:        int(portNum),
				Address:     ipStr,
				Exposure:    exposure,
				IsProtected: exposure != ExposurePublic,
				Process:     procName,
				PID:         pid,
			}

			ports = append(ports, item)
		}
	}

	parseProc("/proc/net/tcp", "tcp")
	parseProc("/proc/net/tcp6", "tcp6")
	parseProc("/proc/net/udp", "udp")
	parseProc("/proc/net/udp6", "udp6")

	return ports
}

type procSocketInfo struct {
	pid  int
	name string
}

func buildSocketInodeMap() map[string]procSocketInfo {
	res := make(map[string]procSocketInfo)

	entries, err := os.ReadDir("/proc")
	if err != nil {
		return res
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		pid, err := strconv.Atoi(entry.Name())
		if err != nil {
			continue
		}

		fdDir := filepath.Join("/proc", entry.Name(), "fd")
		fds, err := os.ReadDir(fdDir)
		if err != nil {
			continue
		}

		var comm string
		for _, fd := range fds {
			link, err := os.Readlink(filepath.Join(fdDir, fd.Name()))
			if err != nil {
				continue
			}
			if strings.HasPrefix(link, "socket:[") && strings.HasSuffix(link, "]") {
				inode := link[8 : len(link)-1]
				if comm == "" {
					if commBytes, cErr := os.ReadFile(filepath.Join("/proc", entry.Name(), "comm")); cErr == nil {
						comm = strings.TrimSpace(string(commBytes))
					}
				}
				res[inode] = procSocketInfo{
					pid:  pid,
					name: comm,
				}
			}
		}
	}

	return res
}

func parseHexIP(hexStr string, proto string) (string, ExposureType) {
	if strings.Contains(proto, "6") {
		// IPv6 hex representation (32 hex characters)
		if hexStr == "00000000000000000000000000000000" {
			return "::", ExposurePublic
		}
		if hexStr == "00000000000000000000000001000000" || hexStr == "00000000000000000000000000000001" {
			return "::1", ExposureLocalhost
		}
		return ":: (IPv6)", ExposurePublic
	}

	// IPv4 hex representation (8 characters, little endian)
	if len(hexStr) != 8 {
		return "0.0.0.0", ExposurePublic
	}

	b, err := strconv.ParseUint(hexStr, 16, 64)
	if err != nil {
		return "0.0.0.0", ExposurePublic
	}

	ip := net.IPv4(byte(b), byte(b>>8), byte(b>>16), byte(b>>24))
	ipStr := ip.String()

	if ip.IsLoopback() || ipStr == "127.0.0.1" {
		return ipStr, ExposureLocalhost
	}
	if ip.IsUnspecified() || ipStr == "0.0.0.0" {
		return ipStr, ExposurePublic
	}
	if strings.HasPrefix(ipStr, "100.") { // Tailscale CGNAT
		return ipStr, ExposureMesh
	}
	if ip.IsPrivate() {
		return ipStr, ExposureMesh
	}

	return ipStr, ExposurePublic
}

func mapPortToProcess(port int) string {
	switch port {
	case 22:
		return "sshd"
	case 80, 443:
		return "nginx"
	case 3000, 3001, 3002:
		return "panel-frontend / node"
	case 5432:
		return "postgresql"
	case 6379:
		return "redis"
	case 8080:
		return "panel-agent"
	case 9090:
		return "prometheus"
	case 9100:
		return "node-exporter"
	case 3100:
		return "loki"
	default:
		return "daemon"
	}
}

// CalculateSecurityScore evaluates all security dimensions and generates recommendations.
func CalculateSecurityScore(
	firewallActive bool,
	vpnActive bool,
	sops SOPSAuditReport,
	f2b Fail2banStatus,
	ports []PortAuditItem,
) (int, string, []string) {
	score := 0
	recs := make([]string, 0)

	// 1. Firewall (25 points)
	if firewallActive {
		score += 25
	} else {
		recs = append(recs, "NixOS güvenlik duvarını (networking.firewall.enable = true) aktif hale getirin.")
	}

	// 2. SOPS & Age Encryption (25 points)
	if sops.KeyFileExists && sops.RegisteredInSops && sops.DecryptionOk {
		score += 25
	} else if sops.KeyFileExists && sops.RegisteredInSops {
		score += 15
		recs = append(recs, "SOPS Age anahtarı kayıtlı fakat henüz canlı deşifre testi doğrulanmadı.")
	} else if sops.KeyFileExists {
		score += 10
		recs = append(recs, "SOPS Age anahtarı .sops.yaml içinde kayıtlı değil. `scripts/age-check.sh` çalıştırın.")
	} else {
		recs = append(recs, "Age anahtarı bulunamadı (/etc/age/key). `scripts/bootstrap.sh` ile oluşturun.")
	}

	// 3. VPN / Mesh Network (15 points)
	if vpnActive {
		score += 15
	} else {
		recs = append(recs, "Düğümler arası güvenli tünel için Tailscale / WireGuard mesh ağını etkinleştirin.")
	}

	// 4. Fail2ban (15 points)
	if f2b.Enabled && f2b.ActiveJails > 0 {
		score += 15
	} else if f2b.Enabled {
		score += 10
	} else {
		score += 5
		recs = append(recs, "Fail2ban servisini aktif hale getirerek SSH kaba kuvvet saldırılarını engelleyin.")
	}

	// 5. Port Exposure (10 points)
	publicCount := 0
	for _, p := range ports {
		if p.Exposure == ExposurePublic && p.Port != 80 && p.Port != 443 {
			publicCount++
		}
	}
	if publicCount == 0 {
		score += 10
	} else {
		recs = append(recs, fmt.Sprintf("%d adet servis doğrudan 0.0.0.0 üzerinde dinleniyor. Sadece yerel ağ veya VPN'e bağlamayı değerlendirin.", publicCount))
	}

	// 6. Sysctl Kernel Hardening (10 points)
	if CheckSysctlHardened() {
		score += 10
	} else {
		score += 5
		recs = append(recs, "Kernel network sertleştirmesini (rp_filter, tcp_syncookies) kontrol edin.")
	}

	if score > 100 {
		score = 100
	}

	var grade string
	switch {
	case score >= 90:
		grade = "A+"
	case score >= 80:
		grade = "A"
	case score >= 70:
		grade = "B"
	case score >= 55:
		grade = "C"
	default:
		grade = "F"
	}

	return score, grade, recs
}
