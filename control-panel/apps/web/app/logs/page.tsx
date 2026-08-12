"use client";

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  timestamp: string;
  priority: number;
  message: string;
  unit?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/agent/laptop/api/v1/logs/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [...prev.slice(-99), entry]); // Keep last 100
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="flex h-screen flex-col p-8">
      <h2 className="mb-4 text-2xl font-semibold">System Logs (journald)</h2>
      <div className="flex-1 overflow-auto rounded-lg border bg-black p-4 font-mono text-sm text-green-400">
        {logs.map((log, i) => (
          <div key={i} className="border-b border-gray-800 py-1">
            <span className="text-gray-500">{log.timestamp}</span>{" "}
            {log.unit && <span className="text-blue-400">[{log.unit}]</span>}{" "}
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
