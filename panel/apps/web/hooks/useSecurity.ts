"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAgent, postAgent } from "@/lib/agent-client";
import { useHostStore } from "@/store/host-store";
import type {
    SecurityStatus,
    SecurityAuditReport,
    SOPSAuditReport,
    Fail2banStatus,
    SecretsInventoryResponse,
    AuthStatus,
    Session,
} from "@/types/api";

export function useSecurity() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const query = useQuery<SecurityStatus>({
        queryKey: ["security", host],
        queryFn: () => fetchAgent<SecurityStatus>(host, "/api/v1/security/status"),
        refetchInterval: 10_000,
    });

    const toggleVPN = useMutation({
        mutationFn: () => postAgent(host, "/api/v1/security/vpn/toggle"),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["security", host] });
            queryClient.invalidateQueries({ queryKey: ["security-audit", host] });
        },
    });

    return {
        ...query,
        toggleVPN,
    };
}

export function useSecurityAudit() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<SecurityAuditReport>({
        queryKey: ["security-audit", host],
        queryFn: () => fetchAgent<SecurityAuditReport>(host, "/api/v1/security/audit"),
        refetchInterval: 15_000,
    });
}

export function useSOPSStatus() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<SOPSAuditReport>({
        queryKey: ["security-sops", host],
        queryFn: () => fetchAgent<SOPSAuditReport>(host, "/api/v1/security/sops"),
        refetchInterval: 30_000,
    });
}

export function useSOPSSecrets() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<SecretsInventoryResponse>({
        queryKey: ["security-secrets", host],
        queryFn: () => fetchAgent<SecretsInventoryResponse>(host, "/api/v1/security/secrets"),
        refetchInterval: 30_000,
    });
}

export function useVerifySOPS() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<SOPSAuditReport, Error>({
        mutationFn: () => postAgent<SOPSAuditReport>(host, "/api/v1/security/sops/verify"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["security-sops", host] });
            queryClient.invalidateQueries({ queryKey: ["security-secrets", host] });
            queryClient.invalidateQueries({ queryKey: ["security-audit", host] });
        },
    });
}

export function useFail2ban() {
    const host = useHostStore((s) => s.selectedHost);

    return useQuery<Fail2banStatus>({
        queryKey: ["security-fail2ban", host],
        queryFn: () => fetchAgent<Fail2banStatus>(host, "/api/v1/security/fail2ban"),
        refetchInterval: 10_000,
    });
}

export function useUnbanIP() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<any, Error, { jail: string; ip: string }>({
        mutationFn: ({ jail, ip }) =>
            postAgent(host, "/api/v1/security/fail2ban/unban", { jail, ip }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["security-fail2ban", host] });
            queryClient.invalidateQueries({ queryKey: ["security-audit", host] });
        },
    });
}

export function useBanIP() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    return useMutation<any, Error, { jail: string; ip: string }>({
        mutationFn: ({ jail, ip }) =>
            postAgent(host, "/api/v1/security/fail2ban/ban", { jail, ip }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["security-fail2ban", host] });
            queryClient.invalidateQueries({ queryKey: ["security-audit", host] });
        },
    });
}

export function useAuth() {
    const host = useHostStore((s) => s.selectedHost);
    const queryClient = useQueryClient();

    const statusQuery = useQuery<AuthStatus>({
        queryKey: ["auth-status", host],
        queryFn: () => fetchAgent<AuthStatus>(host, "/api/v1/auth/status"),
        refetchInterval: 30_000,
    });

    const login = useMutation<Session, Error, { pin?: string; password?: string }>({
        mutationFn: (body) => postAgent<Session>(host, "/api/v1/auth/login", body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth-status", host] });
        },
    });

    const logout = useMutation<any, Error>({
        mutationFn: () => postAgent(host, "/api/v1/auth/logout"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth-status", host] });
        },
    });

    return {
        status: statusQuery.data,
        isLoading: statusQuery.isLoading,
        login,
        logout,
    };
}
