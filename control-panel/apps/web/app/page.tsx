import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/services", label: "Services" },
  { href: "/power", label: "Power" },
  { href: "/network", label: "Network" },
  { href: "/logs", label: "Logs" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/integrations", label: "Integrations" },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-6">
        <h1 className="mb-6 text-xl font-bold">L7V Panel</h1>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <h2 className="mb-4 text-2xl font-semibold">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium">System Status</h3>
            <p className="mt-2 text-gray-600">All systems operational</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium">Active Hosts</h3>
            <p className="mt-2 text-gray-600">2 hosts connected</p>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium">Services</h3>
            <p className="mt-2 text-gray-600">12 running, 0 failed</p>
          </div>
        </div>
      </main>
    </div>
  );
}
