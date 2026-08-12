"use client";

export default function PowerPage() {
  async function handlePower(action: string) {
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    try {
      const res = await fetch(`/api/agent/laptop/api/v1/power/${action}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      alert(`${action} initiated`);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }

  return (
    <div className="p-8">
      <h2 className="mb-4 text-2xl font-semibold">Power Management</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => handlePower("shutdown")}
          className="rounded bg-red-600 px-6 py-4 text-white hover:bg-red-700"
        >
          Shutdown
        </button>
        <button
          onClick={() => handlePower("reboot")}
          className="rounded bg-orange-600 px-6 py-4 text-white hover:bg-orange-700"
        >
          Reboot
        </button>
        <button
          onClick={() => handlePower("sleep")}
          className="rounded bg-blue-600 px-6 py-4 text-white hover:bg-blue-700"
        >
          Sleep
        </button>
      </div>
    </div>
  );
}
