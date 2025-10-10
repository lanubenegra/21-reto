import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function OrdersAdmin() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("orders")
    .select("created_at,email,sku,provider,amount,currency,status")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Órdenes recientes</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>Fecha</th>
            <th>Email</th>
            <th>SKU</th>
            <th>Proveedor</th>
            <th>Monto</th>
            <th>Moneda</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(data || []).map((o, i) => (
            <tr key={i} className="border-b">
              <td>{new Date(o.created_at).toLocaleString()}</td>
              <td>{o.email}</td>
              <td>{o.sku}</td>
              <td>{o.provider}</td>
              <td>{o.amount ?? "-"}</td>
              <td>{o.currency ?? "-"}</td>
              <td>{o.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
