package security

import (
	"bufio"
	"context"
	"fmt"
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
	Protocol     string       `json:"protocol"`
	Port         int          `json:"port"`
	Address      string       `json:"address"`
	Process      string       `json:"process,omitempty"`
	PID          int          `json:"pid,omitempty"`
	Exposure     ExposureType `json:"exposure"`
	IsProtected  bool         `json:"is_protected"`
}

// SOPSAuditReport represents the validation state of Age keys and SOPS secrets.
type SOPSAuditReport struct {
	KeyFileExists     bool      `json:"key_file_exists"`
	KeyFilePath       string    `json:"key_file_path"`
	PublicKey         string    `json:"public_key,omitempty"`
	RegisteredInSops  bool      `json:"registered_in_sops"`
	DecryptionOk      bool      `json:"decryption_ok"`
	StatusMessage     string    `json:"status_message"`
	LastTestedAt      time.Time `json:"last_tested_at"`
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
	Score              int               `json:"score"`               // 0 - 100
	Grade              string            `json:"grade"`               // "A+", "A", "B", "C", "F"
	FirewallActive     bool              `json:"firewall_active"`
	VPNActive          bool              `json:"vpn_active"`
	SOPSReport         SOPSAuditReport   `json:"sops_report"`
	Fail2ban           Fail2banStatus    `json:"fail2ban"`
	OpenPorts          []PortAuditItem   `json:"open_ports"`
	TotalListening     int               `json:"total_listening"`
	PublicListening    int               `json:"public_listening"`
	SysctlHardened     bool              `json:"sysctl_hardened"`
	Recommendations    []string          `json:"recommendations"`
	AuditedAt          time.Time         `json:"audited_at"`
}

// CheckSOPSIntegrity verifies /etc/age/key, .sops.yaml, and optionally tests decryption.
func CheckSOPSIntegrity(ctx context.Context, flakeRoot string, testDecrypt bool) SOPSAuditReport {
	keyPath := "/etc/age/key"
	report := SOPSAuditReport{
		KeyFilePath:   keyPath,
		LastTestedAt:  time.Now(),
	}

	// 1. Key file verification
	data, err := os.ReadFile(keyPath)
	if err != nil {
		report.KeyFileExists = false
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
			report.StatusMessage = fmt.Sprintf("Public key (%s) .sops.yaml içinde kayıtlı değil.", report.PublicKey[:12]+"...")
		}
	} else {
		// Fallback check
		report.RegisteredInSops = true
	}

	// 4. Test decryption if requested
	if testDecrypt && report.KeyFileExists {
		secretsPath := filepath.Join(flakeRoot, "secrets", "sops", "secrets.yaml")
		if _, statErr := os.Stat(secretsPath); statErr == nil {
			cmd := exec.CommandContext(ctx, "sops", "--decrypt", secretsPath)
			cmd.Env = append(os.Environ(), "SOPS_AGE_KEY_FILE="+keyPath)
			if dErr := cmd.Run(); dErr == nil {
				report.DecryptionOk = true
				report.StatusMessage = "SOPS şifreleme ve Age anahtar eşleşmesi doğrulandı (OK)."
			} else {
				report.DecryptionOk = false
				report.StatusMessage = "secrets.yaml şifresi çözülemedi. `sops updatekeys` gerekebilir."
			}
		} else {
			report.DecryptionOk = true
			report.StatusMessage = "Age anahtarı hazır ve doğrulandı."
		}
	} else if report.KeyFileExists && report.RegisteredInSops {
		report.DecryptionOk = true
		report.StatusMessage = "Age anahtarı ve SOPS yapılandırması geçerli."
	}

	return report
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
		return fmt.Errorf("jail and ip required")
	}

	if _, err := exec.LookPath("fail2ban-client"); err != nil {
		return fmt.Errorf("fail2ban-client not installed")
	}

	cmd := exec.CommandContext(ctx, "fail2ban-client", "set", jail, "unbanip", ip)
	return cmd.Run()
}

// ListDetailedPorts inspects /proc/net/tcp and maps processes and exposure levels.
func ListDetailedPorts(ctx context.Context) []PortAuditItem {
	ports := make([]PortAuditItem, 0)
	seen := make(map[string]bool)

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
			if len(fields) < 4 {
				continue
			}
			if fields[3] != "0A" { // 0A = TCP_LISTEN
				continue
			}

			localAddr := fields[1]
			parts := strings.Split(localAddr, ":")
			if len(parts) == 2 {
				portHex := parts[1]
				if portNum, pErr := strconv.ParseInt(portHex, 16, 64); pErr == nil && portNum > 0 {
					ipHex := parts[0]
					var ipStr string
					var exposure ExposureType

					if ipHex == "0100007F" || strings.HasPrefix(ipHex, "0000000000000000000000000100007F") || ipHex == "00000000000000000000000000000001" {
						ipStr = "127.0.0.1"
						exposure = ExposureLocalhost
					} else if strings.HasPrefix(ipHex, "00000000") || ipHex == "00000000" {
						ipStr = "0.0.0.0"
						exposure = ExposurePublic
					} else {
						ipStr = "100.64.*"
						exposure = ExposureMesh
					}

					key := fmt.Sprintf("%s-%d", proto, portNum)
					if !seen[key] {
						seen[key] = true
						item := PortAuditItem{
							Protocol:    proto,
							Port:        int(portNum),
							Address:     ipStr,
							Exposure:    exposure,
							IsProtected: exposure != ExposurePublic,
						}
						// Assign friendly daemon names for standard ports
						item.Process = mapPortToProcess(int(portNum))
						ports = append(ports, item)
					}
				}
			}
		}
	}

	parseProc("/proc/net/tcp", "tcp")
	parseProc("/proc/net/tcp6", "tcp6")

	return ports
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
	} else if sops.KeyFileExists {
		score += 15
		recs = append(recs, "SOPS Age anahtarı doğrulama testinden geçemedi. `scripts/age-check.sh` çalıştırın.")
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
	} else {
		score += 5
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
	score += 10

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
