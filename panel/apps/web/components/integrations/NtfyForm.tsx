"use client";

import { useState, useTransition } from "react";
import { publishNtfy } from "@/actions/ntfy";

export function NtfyForm() {
    const [topic, setTopic] = useState("panel");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!topic || !message) return;
        startTransition(async () => {
            try {
                await publishNtfy(topic, message);
                setStatus("ok");
                setMessage("");
                setTimeout(() => setStatus("idle"), 3000);
            } catch (err) {
                setStatus("error");
                setErrorMsg(err instanceof Error ? err.message : "Unknown error");
            }
        });
    }

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">ntfy</h2>
                <span className="text-xs text-muted-foreground">Push notification</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-2">
                <input
                    type="text"
                    placeholder="Topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
                    required
                />
                <textarea
                    placeholder="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm resize-none"
                    required
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {isPending ? "Sending…" : "Publish"}
                </button>
                {status === "ok" && (
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Published</p>
                )}
                {status === "error" && (
                    <p className="text-xs text-red-600 dark:text-red-400">✗ {errorMsg}</p>
                )}
            </form>
        </div>
    );
}
