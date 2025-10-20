"use client";

export default function ClearViewAsButton() {
  async function clearIt() {
    await fetch("/api/admin/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
      credentials: "include",
    });
    location.reload();
  }

  return (
    <button onClick={clearIt} className="text-sm underline">
      Salir de “ver como”
    </button>
  );
}
