'use client';

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Product = "agenda" | "retos";

type EntitlementRow = {
  id: number;
  email: string;
  product: Product;
  active: boolean;
};

const supabase = supabaseBrowser();

export default function EntitlementsAdmin() {
  const [email, setEmail] = useState("");
  const [list, setList] = useState<EntitlementRow[]>([]);
  const [product, setProduct] = useState<Product>("retos");

  async function search() {
    const { data } = await supabase
      .from("entitlements")
      .select("id,email,product,active")
      .ilike("email", `%${email}%`);
    setList((data as EntitlementRow[] | null) ?? []);
  }

  async function give() {
    const { error } = await supabase.from("entitlements").upsert({ email, product, active: true });
    if (error) alert(error.message);
    else search();
  }

  async function toggle(entry: EntitlementRow) {
    const { error } = await supabase.from("entitlements").update({ active: !entry.active }).eq("id", entry.id);
    if (error) alert(error.message);
    else search();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Accesos (Entitlements)</h1>
      <div className="flex gap-2">
        <input
          className="border p-2 flex-1"
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <select className="border p-2" value={product} onChange={(event) => setProduct(event.target.value as Product)}>
          <option value="agenda">agenda</option>
          <option value="retos">retos</option>
        </select>
        <button className="btn btn-primary" onClick={give}>
          Conceder
        </button>
        <button className="btn" onClick={search}>
          Buscar
        </button>
      </div>
      <ul className="space-y-2">
        {list.map((entry) => (
          <li key={entry.id} className="border p-2 flex justify-between">
            <span>
              {entry.email} — {entry.product} — {entry.active ? "✅ activo" : "❌ inactivo"}
            </span>
            <button className="text-blue-600" onClick={() => toggle(entry)}>
              Alternar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
