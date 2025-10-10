'use client';

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Price = {
  id: number;
  product: "agenda" | "retos" | "combo";
  country: string;
  provider: "wompi" | "stripe";
  currency: string;
  amount: number;
  external_id: string | null;
  active: boolean;
};

const defaultForm: Partial<Price> = {
  product: "retos",
  country: "DEFAULT",
  provider: "stripe",
  currency: "USD",
  amount: 0,
  active: true,
};

export default function PricesAdmin() {
  const [rows, setRows] = useState<Price[]>([]);
  const [form, setForm] = useState<Partial<Price>>(defaultForm);

  async function load() {
    const { data } = await supabaseBrowser.from("prices").select("*").order("product");
    setRows(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const { error } = await supabaseBrowser.from("prices").upsert(form);
    if (error) alert(error.message);
    else {
      setForm(defaultForm);
      await load();
    }
  }

  async function remove(id: number) {
    if (!confirm("Eliminar precio?")) return;
    const { error } = await supabaseBrowser.from("prices").delete().eq("id", id);
    if (error) alert(error.message);
    else await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Precios por país</h1>

      <div className="grid md:grid-cols-6 gap-2">
        <select
          className="border p-2"
          value={form.product as Price["product"]}
          onChange={(e) => setForm((f) => ({ ...f, product: e.target.value as Price["product"] }))}
        >
          <option value="agenda">agenda</option>
          <option value="retos">retos</option>
          <option value="combo">combo</option>
        </select>
        <input
          className="border p-2"
          placeholder="País (CO/MX/DEFAULT)"
          value={form.country || ""}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
        />
        <select
          className="border p-2"
          value={form.provider as Price["provider"]}
          onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as Price["provider"] }))}
        >
          <option value="stripe">stripe</option>
          <option value="wompi">wompi</option>
        </select>
        <input
          className="border p-2"
          placeholder="Moneda (USD/COP/...)"
          value={form.currency || ""}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
        />
        <input
          className="border p-2"
          type="number"
          step="0.01"
          placeholder="Monto"
          value={form.amount ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
        />
        <input
          className="border p-2 col-span-6"
          placeholder="external_id (Stripe price_id o link Wompi)"
          value={form.external_id || ""}
          onChange={(e) => setForm((f) => ({ ...f, external_id: e.target.value }))}
        />
        <label className="col-span-6 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active ?? true}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />{" "}
          Activo
        </label>
        <button className="btn btn-primary col-span-6" onClick={save}>
          Guardar/Actualizar
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>Producto</th>
            <th>País</th>
            <th>Proveedor</th>
            <th>Moneda</th>
            <th>Monto</th>
            <th>external_id</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td>{r.product}</td>
              <td>{r.country}</td>
              <td>{r.provider}</td>
              <td>{r.currency}</td>
              <td>{r.amount}</td>
              <td className="truncate max-w-[320px]">{r.external_id}</td>
              <td>{r.active ? "✅" : "❌"}</td>
              <td>
                <button className="text-red-600" onClick={() => remove(r.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
