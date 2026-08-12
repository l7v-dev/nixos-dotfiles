export default function MonitoringPage() {
  return (
    <div className="p-8">
      <h2 className="mb-4 text-2xl font-semibold">Monitoring</h2>
      <iframe
        src="http://127.0.0.1:3001/dashboards"
        className="h-[600px] w-full rounded-lg border"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
