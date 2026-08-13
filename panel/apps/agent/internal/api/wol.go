package api

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
)

// WoLRequest is the JSON body for POST /api/v1/power/wol.
type WoLRequest struct {
	// MAC address of the target host (any common separator: aa:bb:cc:dd:ee:ff or aa-bb-cc-dd-ee-ff).
	MAC string `json:"mac"`
	// Broadcast address to send the magic packet to. Defaults to 255.255.255.255.
	Broadcast string `json:"broadcast,omitempty"`
	// Port to send the UDP packet on. Defaults to 9 (discard port, standard WoL).
	Port int `json:"port,omitempty"`
}

// WoLResponse is returned on success.
type WoLResponse struct {
	MAC       string `json:"mac"`
	Broadcast string `json:"broadcast"`
	Port      int    `json:"port"`
	Status    string `json:"status"`
}

// wolHandler handles POST /api/v1/power/wol.
// Sends a Wake-on-LAN magic packet over UDP broadcast.
func wolHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req WoLRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "invalid JSON: " + err.Error(),
			})
			return
		}

		if req.MAC == "" {
			writeError(w, http.StatusBadRequest, map[string]string{
				"message": "mac is required",
			})
			return
		}

		broadcast := req.Broadcast
		if broadcast == "" {
			broadcast = "255.255.255.255"
		}
		port := req.Port
		if port == 0 {
			port = 9
		}

		if err := sendMagicPacket(req.MAC, broadcast, port); err != nil {
			writeError(w, http.StatusBadRequest, map[string]string{
				"mac":     req.MAC,
				"message": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(WoLResponse{ //nolint:errcheck
			MAC:       req.MAC,
			Broadcast: broadcast,
			Port:      port,
			Status:    "sent",
		})
	}
}

// wolHostsHandler handles GET /api/v1/power/wol/hosts.
// Returns the known WoL hosts configured via PANEL_WOL_HOSTS env var.
func wolHostsHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		type hostEntry struct {
			Name string `json:"name"`
			MAC  string `json:"mac"`
		}
		entries := make([]hostEntry, 0, len(d.WoLHosts))
		for name, mac := range d.WoLHosts {
			entries = append(entries, hostEntry{Name: name, MAC: mac})
		}
		// Sort by name for deterministic output.
		for i := 1; i < len(entries); i++ {
			for j := i; j > 0 && entries[j].Name < entries[j-1].Name; j-- {
				entries[j], entries[j-1] = entries[j-1], entries[j]
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(entries) //nolint:errcheck
	}
}
// Magic packet format: 6 bytes of 0xFF followed by the target MAC repeated 16 times.
func sendMagicPacket(macAddr, broadcast string, port int) error {
	// Normalise MAC: strip separators, accept ':', '-', '.', ' '
	clean := strings.NewReplacer(":", "", "-", "", ".", "", " ", "").Replace(macAddr)
	if len(clean) != 12 {
		return fmt.Errorf("invalid MAC address length: %q (expected 12 hex chars after stripping separators)", macAddr)
	}
	macBytes, err := hex.DecodeString(clean)
	if err != nil {
		return fmt.Errorf("invalid MAC address %q: %w", macAddr, err)
	}

	// Build the 102-byte magic packet.
	packet := make([]byte, 102)
	// 6 × 0xFF header
	for i := 0; i < 6; i++ {
		packet[i] = 0xFF
	}
	// 16 repetitions of the MAC
	for i := 1; i <= 16; i++ {
		copy(packet[i*6:], macBytes)
	}

	// Resolve broadcast address.
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", broadcast, port))
	if err != nil {
		return fmt.Errorf("resolve broadcast address %q: %w", broadcast, err)
	}

	conn, err := net.DialUDP("udp", nil, addr)
	if err != nil {
		return fmt.Errorf("dial UDP: %w", err)
	}
	defer conn.Close() //nolint:errcheck

	_, err = conn.Write(packet)
	if err != nil {
		return fmt.Errorf("send magic packet: %w", err)
	}
	return nil
}
