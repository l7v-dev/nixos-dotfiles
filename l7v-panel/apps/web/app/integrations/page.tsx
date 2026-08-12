"use client";

import { useEffect, useState } from "react";

interface ServiceStatus {
  name: string;
  healthy: boolean;
  status?: string;
}

export default function IntegrationsPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);

  useEffect(() => {
    async function checkServices() {
      try {
        const res = await fetch("/api/integrations/status");
        const data = await res.json();
        setServices(data.services || []);
      } catch (error) {
        console.error("Failed to check services:", error);
      }
    }
    checkServices();
  }, []);

  return (
    <div className="p-8">
      <h2 className="mb-4 text-2xl font-semibold">External Integrations</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">Forgejo</h3>
          <p className="mt-2 text-sm text-gray-600">git.l7v.dev</p>
          <p className="mt-1 text-sm">
            Status:{" "}
            {services.find((s) => s.name === "forgejo")?.healthy ? (
              <span className="text-green-600">Healthy</span>
            ) : (
              <span className="text-red-600">Unknown</span>
            )}
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">Vaultwarden</h3>
          <p className="mt-2 text-sm text-gray-600">vault.l7v.dev</p>
          <p className="mt-1 text-sm">
            Status:{" "}
            {services.find((s) => s.name === "vaultwarden")?.healthy ? (
              <span className="text-green-600">Healthy</span>
            ) : (
              <span className="text-red-600">Unknown</span>
            )}
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">Prometheus</h3>
          <p className="mt-2 text-sm text-gray-600">127.0.0.1:9090</p>
          <p className="mt-1 text-sm">
            Status:{" "}
            {services.find((s) => s.name === "prometheus")?.healthy ? (
              <span className="text-green-600">Healthy</span>
            ) : (
              <span className="text-red-600">Unknown</span>
            )}
          </p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-lg font-medium">ntfy</h3>
          <p className="mt-2 text-sm text-gray-600">ntfy.l7v.dev</p>
          <p className="mt-1 text-sm">
            Status:{" "}
            {services.find((s) => s.name === "ntfy")?.healthy ? (
              <span className="text-green-600">Healthy</span>
            ) : (
              <span className="text-red-600">Unknown</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
