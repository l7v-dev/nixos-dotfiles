import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SecurityCard } from "../SecurityCard";
import { SecurityDrawer } from "../SecurityDrawer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockToggleVPN = vi.fn();
const mockVerifySOPS = vi.fn();
const mockUnbanIP = vi.fn();
const mockBanIP = vi.fn();

vi.mock("@/hooks/useSecurity", () => ({
    useSecurity: () => ({
        data: {
            vpn: { active: true, type: "tailscale", status: "connected", ip_address: "100.64.0.1" },
            open_ports: [
                { protocol: "tcp", port: 22, address: "127.0.0.1", process: "sshd" },
                { protocol: "tcp", port: 80, address: "0.0.0.0", process: "nginx" },
            ],
            sessions: [{ id: "1", user: "l7v", tty: "pts/1" }],
            firewall_on: true,
        },
        isLoading: false,
        toggleVPN: { mutate: mockToggleVPN, isPending: false },
    }),
    useSecurityAudit: () => ({
        data: {
            score: 92,
            grade: "A+",
            firewall_active: true,
            vpn_active: true,
            sysctl_hardened: true,
            sops_report: {
                key_file_exists: true,
                key_file_path: "/etc/age/key",
                public_key: "age1testkey99999",
                registered_in_sops: true,
                decryption_ok: true,
                status_message: "SOPS şifreleme ve Age anahtar eşleşmesi doğrulandı (OK).",
            },
            fail2ban: {
                enabled: true,
                active_jails: 1,
                total_banned_ip: 1,
                jails: [
                    { name: "sshd", currently_banned: 1, total_banned: 5, banned_ips: ["192.168.1.100"] },
                ],
            },
            open_ports: [
                { protocol: "tcp", port: 22, address: "127.0.0.1", exposure: "localhost", process: "sshd", is_protected: true },
                { protocol: "tcp", port: 80, address: "0.0.0.0", exposure: "public", process: "nginx", is_protected: false },
            ],
            recommendations: [],
        },
        isLoading: false,
        refetch: vi.fn(),
    }),
    useSOPSStatus: () => ({
        data: {
            key_file_exists: true,
            key_file_path: "/etc/age/key",
            public_key: "age1testkey99999",
            registered_in_sops: true,
            decryption_ok: true,
            status_message: "SOPS şifreleme ve Age anahtar eşleşmesi doğrulandı (OK).",
        },
        isLoading: false,
        refetch: vi.fn(),
    }),
    useSOPSSecrets: () => ({
        data: {
            secrets: [
                { key: "backup/restic_password", category: "backup", associated_app: "restic", encrypted: true },
                { key: "forgejo/admin_password", category: "forgejo", associated_app: "forgejo", encrypted: true },
            ],
            total: 2,
        },
        isLoading: false,
        refetch: vi.fn(),
    }),
    useVerifySOPS: () => ({
        mutate: mockVerifySOPS,
        isPending: false,
    }),
    useFail2ban: () => ({
        data: {
            enabled: true,
            active_jails: 1,
            total_banned_ip: 1,
            jails: [
                { name: "sshd", currently_banned: 1, total_banned: 5, banned_ips: ["192.168.1.100"] },
            ],
        },
        isLoading: false,
        refetch: vi.fn(),
    }),
    useUnbanIP: () => ({
        mutate: mockUnbanIP,
        isPending: false,
    }),
    useBanIP: () => ({
        mutate: mockBanIP,
        isPending: false,
    }),
}));

vi.mock("@/store/host-store", () => ({
    useHostStore: (selector: (s: { selectedHost: string }) => string) =>
        selector({ selectedHost: "laptop" }),
}));

function renderWithClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Security & SOPS Frontend Components", () => {
    it("renders SecurityCard with telemetry metrics correctly", () => {
        renderWithClient(<SecurityCard />);

        expect(screen.getByText("Security & SOPS Secrets")).toBeDefined();
        expect(screen.getByText(/Security Score: 92% \(Grade A\+\)/i)).toBeDefined();
        expect(screen.getByText("Firewall Active")).toBeDefined();
        expect(screen.getByText("Verified")).toBeDefined();
        expect(screen.getByText("2 Ports")).toBeDefined();
        expect(screen.getByText("1 Banned IPs")).toBeDefined();
    });

    it("opens SecurityDrawer when clicking Audit Details", () => {
        renderWithClient(<SecurityCard />);

        const auditBtn = screen.getByText("Audit Details");
        fireEvent.click(auditBtn);

        expect(screen.getByText("Güvenlik & SOPS Merkezi")).toBeDefined();
    });

    it("renders SecurityDrawer tabs and allows switching to SOPS tab", () => {
        const onOpenChange = vi.fn();
        renderWithClient(<SecurityDrawer open={true} onOpenChange={onOpenChange} />);

        expect(screen.getByText("Güvenlik & SOPS Merkezi")).toBeDefined();
        expect(screen.getByText("%92")).toBeDefined();

        // Switch to SOPS tab
        const sopsTabBtn = screen.getByText("SOPS & Age Şifreleme");
        fireEvent.click(sopsTabBtn);

        expect(screen.getByText("Age Anahtar Dosyası")).toBeDefined();
        expect(screen.getByText("age1testkey99999")).toBeDefined();
        expect(screen.getByText("backup/restic_password")).toBeDefined();
        expect(screen.getByText("forgejo/admin_password")).toBeDefined();
    });

    it("triggers SOPS verification when clicking test button", () => {
        const onOpenChange = vi.fn();
        renderWithClient(<SecurityDrawer open={true} onOpenChange={onOpenChange} />);

        const sopsTabBtn = screen.getByText("SOPS & Age Şifreleme");
        fireEvent.click(sopsTabBtn);

        const verifyBtn = screen.getByText("Şimdi Test Et");
        fireEvent.click(verifyBtn);

        expect(mockVerifySOPS).toHaveBeenCalledTimes(1);
    });
});
