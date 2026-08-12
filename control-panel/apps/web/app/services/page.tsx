"use client";

import { useEffect, useState } from "react";

interface Service {
  name: string;
  state: string;
  subState: string;
  loadState: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/agent/laptop/api/v1/services");
        const data = await res.json();
        setServices(data.services || []);
      } catch (error) {
        console.error("Failed to fetch services:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  return (
    <div className="p-8">
      <h2 className="mb-4 text-2xl font-semibold">Systemd Services</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">State</th>
              <th className="border p-2 text-left">Sub State</th>
              <th className="border p-2 text-left">Load</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => (
              <tr key={svc.name} className="hover:bg-gray-50">
                <td className="border p-2 font-mono">{svc.name}</td>
                <td className="border p-2">
                  <span
                    className={`rounded px-2 py-1 ${
                      svc.state === "running"
                        ? "bg-green-100 text-green-800"
                        : svc.state === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {svc.state}
                  </span>
                </td>
                <td className="border p-2">{svc.subState}</td>
                <td className="border p-2">{svc.loadState}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
