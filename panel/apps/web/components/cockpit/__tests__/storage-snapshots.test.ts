import { describe, it, expect } from "vitest";
import type { SnapperSnapshot, ResticStatus, CreateSnapshotRequest } from "@/types/api";

describe("Btrfs Snapper & Restic Storage Management", () => {
    const sampleSnapshots: SnapperSnapshot[] = [
        {
            id: 0,
            config: "root",
            type: "single",
            date: "2026-08-15T00:00:00Z",
            date_string: "current",
            description: "current",
        },
        {
            id: 1,
            config: "root",
            type: "single",
            date: "2026-08-15T01:00:00Z",
            date_string: "2026-08-15 01:00:00",
            cleanup: "timeline",
            description: "timeline snapshot",
        },
        {
            id: 42,
            config: "root",
            type: "pre",
            date: "2026-08-15T01:15:30Z",
            date_string: "2026-08-15 01:15:30",
            cleanup: "number",
            description: "Pre-nixos switch",
        },
        {
            id: 43,
            config: "root",
            type: "post",
            pre_id: 42,
            date: "2026-08-15T01:16:05Z",
            date_string: "2026-08-15 01:16:05",
            cleanup: "number",
            description: "Post-nixos switch",
        },
    ];

    it("verifies snapshot list and distinguishes snapshot 0 as current", () => {
        expect(sampleSnapshots).toHaveLength(4);
        const current = sampleSnapshots.find((s) => s.id === 0);
        expect(current).toBeDefined();
        expect(current?.description).toBe("current");

        const userSnapshots = sampleSnapshots.filter((s) => s.id > 0);
        expect(userSnapshots).toHaveLength(3);
    });

    it("filters snapshots by description and cleanup tags", () => {
        const preSnapshots = sampleSnapshots.filter((s) => s.type === "pre");
        expect(preSnapshots).toHaveLength(1);
        expect(preSnapshots[0].id).toBe(42);

        const timelineSnapshots = sampleSnapshots.filter((s) => s.cleanup === "timeline");
        expect(timelineSnapshots).toHaveLength(1);
        expect(timelineSnapshots[0].id).toBe(1);
    });

    it("verifies Restic status structure", () => {
        const sampleRestic: ResticStatus = {
            enabled: true,
            repository: "s3:s3.amazonaws.com/l7v-backups/restic",
            backend: "s3",
            service_active: true,
            service_substate: "running",
            last_run_time: "2026-08-15T00:00:00Z",
            last_run_success: true,
            snapshot_count: 7,
            paths: ["/var/lib", "/var/backup", "/etc", "/home"],
        };

        expect(sampleRestic.enabled).toBe(true);
        expect(sampleRestic.backend).toBe("s3");
        expect(sampleRestic.last_run_success).toBe(true);
        expect(sampleRestic.paths).toHaveLength(4);
    });

    it("formats CreateSnapshotRequest properly", () => {
        const req: CreateSnapshotRequest = {
            config: "root",
            description: "Pre-upgrade backup",
            cleanup: "number",
        };

        expect(req.config).toBe("root");
        expect(req.description).toBe("Pre-upgrade backup");
        expect(req.cleanup).toBe("number");
    });
});
