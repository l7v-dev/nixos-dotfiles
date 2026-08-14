import { describe, expect, test } from "vitest";
import { stripAnsi, renderFormattedLogMessage } from "../ansi-parser";

describe("stripAnsi", () => {
    test("strips standard color codes", () => {
        const input = "\x1b[31mError message\x1b[0m";
        expect(stripAnsi(input)).toBe("Error message");
    });

    test("handles plain text without modifications", () => {
        const input = "Plain system message";
        expect(stripAnsi(input)).toBe("Plain system message");
    });

    test("handles multiple mixed ANSI codes", () => {
        const input = "\x1b[1;32m[SUCCESS]\x1b[0m Service \x1b[34mnginx\x1b[0m started";
        expect(stripAnsi(input)).toBe("[SUCCESS] Service nginx started");
    });
});

describe("renderFormattedLogMessage", () => {
    test("returns plain string when no search query is given", () => {
        const res = renderFormattedLogMessage("Hello world");
        expect(res).toBe("Hello world");
    });

    test("highlights matched search substring", () => {
        const res = renderFormattedLogMessage("Service started successfully", "started");
        expect(Array.isArray(res)).toBe(true);
    });
});
