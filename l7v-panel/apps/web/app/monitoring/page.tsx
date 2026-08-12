"use client";

import { useState } from "react";

export default function MonitoringPage() {
    const [loadError, setLoadError] = useState(false);
    const [key, setKey] = useState(0);

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-xl font-semibold mb-3">Monitoring</h1>
            {loadError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card">
                    <p className="text-sm text-muted-foreground">Grafana is currently unavailable</p>
                    <button
                        onClick={() => { setLoadError(false); setKey((k) => k + 1); }}
                        className="rounded px-4 py-1.5 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <iframe
                    key={key}
                    src="/grafana/"
                    className="flex-1 w-full rounded-lg border border-border"
                    title="Grafana dashboards"
                    onError={() => setLoadError(true)}
                    onLoad={(e) => {
                        // Detect empty/broken frame (cross-origin check is limited, but catches complete failures).
                        try {
                            const iframe = e.currentTarget as HTMLIFrameElement;
                            if (!iframe.contentDocument && !iframe.contentWindow) {
                                setLoadError(true);
                            }
                        } catch {
                            // Cross-origin — assume it loaded successfully.
                        }
                    }}
                />
            )}
        </div>
    );
}
