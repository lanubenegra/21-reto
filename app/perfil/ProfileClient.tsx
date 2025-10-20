"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileData = {
  display_name?: string | null;
  country?: string | null;
  whatsapp?: string | null;
  timezone?: string | null;
  photo_url?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type Entitlement = {
  product: string;
  active: boolean;
  created_at?: string | null;
};

type Props = {
  profile: ProfileData | null;
  email: string;
  entitlements: Entitlement[];
};

export default function ProfileClient({ profile, email, entitlements }: Props) {
  const initialName = profile?.display_name ?? "";
  const [form, setForm] = useState({
    display_name: initialName,
    country: profile?.country ?? "",
    whatsapp: profile?.whatsapp ?? "",
    timezone: profile?.timezone ?? "",
    photo_url: profile?.photo_url ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const entitlementList = useMemo(
    () =>
      entitlements.length
        ? entitlements
        : [{ product: "retos", active: false }, { product: "agenda", active: false }],
    [entitlements]
  );

  async function submitProfile() {
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const trimmedName = form.display_name.trim();
      if (trimmedName.length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres.");
      }

      const payload: Record<string, string> = {
        display_name: trimmedName,
      };

      if (form.country.trim()) {
        payload.country = form.country.trim().toUpperCase();
      }
      if (form.whatsapp.trim()) {
        payload.whatsapp = form.whatsapp.trim();
      }
      if (form.timezone.trim()) {
        payload.timezone = form.timezone.trim();
      }
      if (form.photo_url.trim()) {
        payload.photo_url = form.photo_url.trim();
      }

      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "No se pudo guardar el perfil.");
      }

      setProfileMessage("Perfil actualizado.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Error desconocido al guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword() {
    setSavingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      if (!currentPassword || !newPassword) {
        throw new Error("Completa ambos campos de contraseña.");
      }
      const res = await fetch("/api/me/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = body?.error;
        if (code === "invalid_password") {
          throw new Error("La contraseña actual no es correcta.");
        }
        if (code === "no_password") {
          throw new Error("Tu cuenta aún no tiene contraseña establecida.");
        }
        throw new Error(code ?? "No se pudo cambiar la contraseña.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Contraseña actualizada correctamente.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Error desconocido al cambiar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-white/70 p-6 shadow-sm">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-mana-primary">Tu perfil</h1>
        <p className="text-sm text-mana-primary/70">
          Actualiza tus datos de contacto para que podamos ayudarte mejor.
        </p>
        <div className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
              Nombre
              <input
                className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
                value={form.display_name}
                onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                placeholder="Tu nombre"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
              País
              <input
                className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                placeholder="CO"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
              WhatsApp
              <input
                className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
                value={form.whatsapp}
                onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                placeholder="+57..."
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
              Zona horaria
              <input
                className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                placeholder="America/Bogota"
              />
            </label>
            <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
              Foto (URL)
              <input
                className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
                value={form.photo_url}
                onChange={(event) => setForm((prev) => ({ ...prev, photo_url: event.target.value }))}
                placeholder="https://..."
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={submitProfile} disabled={savingProfile}>
              {savingProfile ? "Guardando…" : "Guardar cambios"}
            </Button>
            {profileMessage && <span className="text-sm text-emerald-600">{profileMessage}</span>}
            {profileError && <span className="text-sm text-red-600">{profileError}</span>}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-mana-primary">Seguridad</h2>
        <p className="text-sm text-mana-primary/70">
          Cambia tu contraseña en cualquier momento. Usa una clave segura que solo tú recuerdes.
        </p>
        <div className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs md:max-w-md">
          <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Contraseña actual
            <input
              type="password"
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="mt-3 text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Nueva contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={submitPassword} disabled={savingPassword}>
              {savingPassword ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
            {passwordMessage && <span className="text-sm text-emerald-600">{passwordMessage}</span>}
            {passwordError && <span className="text-sm text-red-600">{passwordError}</span>}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-mana-primary">Tus accesos</h2>
        <p className="text-sm text-mana-primary/70">Estos son los productos activos en tu cuenta ({email}).</p>
        <div className="grid gap-3 md:grid-cols-2">
          {entitlementList.map((item) => (
            <div
              key={item.product}
              className="rounded-xl border border-mana-primary/10 bg-white px-4 py-3 shadow-xs"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-mana-primary">
                <span className="capitalize">{item.product}</span>
                <span className={item.active ? "text-emerald-600" : "text-red-500"}>
                  {item.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              {item.created_at && (
                <div className="mt-1 text-xs text-mana-primary/60">
                  Desde {new Date(item.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
