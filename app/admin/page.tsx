"use client";

import { useCallback, useEffect, useState } from "react";

type ProfileRow = {
  id?: string;
  email?: string | null;
  display_name?: string | null;
  country?: string | null;
  city?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  role?: string | null;
  whatsapp?: string | null;
  timezone?: string | null;
  photo_url?: string | null;
};

type EntitlementProduct = "agenda" | "retos" | "combo";

type EntitlementRow = {
  id?: number;
  email: string;
  product: EntitlementProduct;
  active: boolean;
};

type OrderRow = {
  id?: number;
  email: string;
  provider: string;
  sku: string;
  status: string;
  created_at: string;
};

type SearchData = {
  profiles: ProfileRow[];
  entitlements: EntitlementRow[];
  orders: OrderRow[];
};

const emptyResults: SearchData = {
  profiles: [],
  entitlements: [],
  orders: [],
};

export default function AdminPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);

  const searchWith = useCallback(async (value: string) => {
    const term = value.trim();
    if (!term) {
      setData(emptyResults);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(term)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = (await res.json()) as Partial<SearchData>;
      setData({
        profiles: payload.profiles ?? [],
        entitlements: payload.entitlements ?? [],
        orders: payload.orders ?? [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/view-as", {
          cache: "no-store",
          credentials: "include",
        });
        const payload = (await res.json()) as { email?: string | null };
        if (payload.email) {
          setQuery(payload.email);
          await searchWith(payload.email);
        }
      } catch {
        // ignore preload errors
      }
    })();
  }, [searchWith]);

  async function search() {
    await searchWith(query);
  }

  async function grant(email: string, product: EntitlementProduct) {
    await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, product }),
      credentials: "include",
    });
    await searchWith(email);
  }

  async function revoke(email: string, product: EntitlementProduct) {
    await fetch("/api/admin/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, product }),
      credentials: "include",
    });
    await searchWith(email);
  }

  async function regrantAgenda(email: string) {
    await fetch("/api/admin/regrant-agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
  }

  async function setViewAs(email: string) {
    if (!email.trim()) return;
    await fetch("/api/admin/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    location.reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Panel de Administración</h1>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex gap-2 flex-1">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Buscar por email, nombre…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="bg-black text-white px-4 rounded" onClick={search} disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
        <button
          className="px-3 py-2 border rounded"
          onClick={() => setViewAs(query)}
          title="Filtra todo el panel por este email"
          disabled={!query.trim()}
        >
          Ver como este email
        </button>
      </div>

      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <section>
              <h2 className="font-medium mb-2">Perfíl</h2>
              <div className="space-y-2">
                {data.profiles.length ? (
                  data.profiles.map((profile, idx) => {
                    const key = profile.id ?? profile.email ?? `profile-${idx}`;
                    const email = profile.email ?? "";
                    return (
                      <div key={key} className="border rounded p-3 space-y-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-mono text-base">{email || "—"}</div>
                            <div>{profile.display_name ?? "Sin nombre"}</div>
                            <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                              <span>Rol: {profile.role ?? "user"}</span>
                              {profile.whatsapp && <span>WhatsApp: {profile.whatsapp}</span>}
                              {profile.country && <span>País: {profile.country}</span>}
                              {profile.city && <span>Ciudad: {profile.city}</span>}
                              {profile.document_type && <span>Doc: {profile.document_type}</span>}
                              {profile.document_number && <span># {profile.document_number}</span>}
                            </div>
                          </div>
                          <button
                            className="px-2 py-1 border rounded text-xs"
                            onClick={() => setViewAs(email)}
                            disabled={!email}
                          >
                            Ver como
                          </button>
                        </div>
                        {profile.id && (
                          <ProfileEditor
                            profile={profile}
                            onSaved={async () => {
                              await searchWith(email || query);
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">Sin perfiles para este criterio.</div>
                )}
              </div>
            </section>

            <section>
              <h2 className="font-medium mb-2">Entitlements</h2>
              <div className="space-y-2">
                {data.entitlements.length ? (
                  data.entitlements.map((entry, idx) => {
                    const key = entry.id ?? `${entry.email}-${entry.product}-${idx}`;
                    return (
                      <div
                        key={key}
                        className="border rounded p-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-mono text-sm">{entry.email}</div>
                          <div className="text-xs text-gray-500">
                            {entry.product} · {entry.active ? "activo" : "inactivo"}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button className="px-3 py-1 border rounded" onClick={() => setViewAs(entry.email)}>
                            Ver como
                          </button>
                          {entry.product === "agenda" && (
                            <button className="px-3 py-1 border rounded" onClick={() => regrantAgenda(entry.email)}>
                              Re-grant Agenda
                            </button>
                          )}
                          {entry.active ? (
                            <button
                              className="px-3 py-1 border rounded"
                              onClick={() => revoke(entry.email, entry.product)}
                            >
                              Revocar
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1 border rounded"
                              onClick={() => grant(entry.email, entry.product)}
                            >
                              Activar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">Sin entitlements para este criterio.</div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section>
              <h2 className="font-medium mb-2">Otorgar manual</h2>
              <GrantQuick
                onDone={async (email) => {
                  setQuery(email);
                  await searchWith(email);
                }}
              />
            </section>

            <section>
              <h2 className="font-medium mt-6 mb-2">Órdenes recientes</h2>
              <div className="space-y-2">
                {data.orders.length ? (
                  data.orders.map((order, idx) => {
                    const key = order.id ?? `${order.email}-${order.created_at}-${idx}`;
                    return (
                      <div key={key} className="border rounded p-3 space-y-1 text-sm">
                        <div className="font-mono text-base">{order.email}</div>
                        <div className="text-xs text-gray-500">
                          {order.provider} · {order.sku} · {order.status}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">Sin órdenes para este criterio.</div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function GrantQuick({ onDone }: { onDone: (email: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState<EntitlementProduct>("retos");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const normalized = email.trim();
    if (!normalized) return;
    setBusy(true);
    try {
      await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, product }),
        credentials: "include",
      });
      await onDone(normalized);
      setEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        className="border rounded px-3 py-2 flex-1"
        placeholder="email@dominio.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <select
        className="border rounded px-2 py-2"
        value={product}
        onChange={(event) => setProduct(event.target.value as EntitlementProduct)}
      >
        <option value="retos">Retos</option>
        <option value="agenda">Agenda</option>
        <option value="combo">Combo</option>
      </select>
      <button className="bg-black text-white px-4 rounded" onClick={submit} disabled={busy}>
        {busy ? "Otorgando…" : "Dar acceso"}
      </button>
    </div>
  );
}

type ProfileEditorProps = {
  profile: ProfileRow;
  onSaved: () => Promise<void> | void;
};

function ProfileEditor({ profile, onSaved }: ProfileEditorProps) {
  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    country: profile.country ?? "",
    whatsapp: profile.whatsapp ?? "",
    city: profile.city ?? "",
    document_type: profile.document_type ?? "",
    document_number: profile.document_number ?? "",
    timezone: profile.timezone ?? "",
    photo_url: profile.photo_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      display_name: profile.display_name ?? "",
      country: profile.country ?? "",
      whatsapp: profile.whatsapp ?? "",
      city: profile.city ?? "",
      document_type: profile.document_type ?? "",
      document_number: profile.document_number ?? "",
      timezone: profile.timezone ?? "",
      photo_url: profile.photo_url ?? "",
    });
    setPassword("");
    setMessage(null);
    setError(null);
  }, [profile.id, profile.display_name, profile.country, profile.whatsapp, profile.city, profile.document_type, profile.document_number, profile.timezone, profile.photo_url]);

  async function saveProfile() {
    if (!profile.id) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, string | null> = {};
      const fieldKeys: Array<keyof typeof form> = [
        "display_name",
        "country",
        "city",
        "document_type",
        "document_number",
        "whatsapp",
        "timezone",
        "photo_url",
      ];
      fieldKeys.forEach((key) => {
        const originalValue = profile[key as keyof ProfileRow];
        const raw = form[key] ?? "";
        const trimmed = raw.trim();
        const normalizedOriginal = typeof originalValue === "string" ? originalValue.trim() : "";

        if (trimmed === normalizedOriginal) {
          return;
        }

        if (!trimmed) {
          payload[key] = null;
          return;
        }

        let nextValue = trimmed;
        if (key === "country" || key === "document_type") {
          nextValue = trimmed.toUpperCase();
        }
        payload[key] = nextValue;
      });

      if (!Object.keys(payload).length) {
        setMessage("No hay cambios para guardar.");
        return;
      }

      const res = await fetch("/api/admin/users/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, ...payload }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "No se pudo guardar");
      }
      setMessage("Perfil actualizado.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    if (!profile.id || !password.trim()) return;
    setPasswordBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, newPassword: password }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "No se pudo actualizar la contraseña");
      }
      setPassword("");
      setMessage("Contraseña actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Nombre
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.display_name}
            onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          País
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))}
            placeholder="CO"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Ciudad
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            placeholder="Medellín"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          WhatsApp
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.whatsapp}
            onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
            placeholder="+57..."
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Tipo documento
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.document_type}
            onChange={(event) => setForm((prev) => ({ ...prev, document_type: event.target.value.toUpperCase() }))}
            placeholder="CC, CE, NIT..."
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Número documento
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.document_number}
            onChange={(event) => setForm((prev) => ({ ...prev, document_number: event.target.value }))}
            placeholder="1234567890"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Zona horaria
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.timezone}
            onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            placeholder="America/Bogota"
          />
        </label>
        <label className="md:col-span-2 text-xs uppercase tracking-wide text-gray-500">
          Foto (URL)
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.photo_url}
            onChange={(event) => setForm((prev) => ({ ...prev, photo_url: event.target.value }))}
            placeholder="https://..."
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="bg-black text-white px-3 py-2 rounded"
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? "Guardando…" : "Guardar perfil"}
        </button>
      </div>
      <div className="border-t pt-3 space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Nueva contraseña (solo superadmin)
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
          />
        </label>
        <button
          className="border px-3 py-2 rounded"
          onClick={updatePassword}
          disabled={passwordBusy || !password.trim()}
        >
          {passwordBusy ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </div>
      {(message || error) && (
        <div className={error ? "text-sm text-red-600" : "text-sm text-green-600"}>
          {error ?? message}
        </div>
      )}
    </div>
  );
}
