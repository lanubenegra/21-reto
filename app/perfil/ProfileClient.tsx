"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type ProfileData = {
  display_name?: string | null;
  country?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  role?: string | null;
  created_at?: string | null;
};

type Entitlement = {
  product: string;
  active: boolean;
  created_at?: string | null;
};

export type GoalHighlight = {
  id: string;
  title: string;
  detail?: string | null;
  area?: string | null;
  targetDate?: string | null;
  completed?: boolean;
};

export type NoteHighlight = {
  date: string;
  text: string;
};

type Props = {
  profile: ProfileData | null;
  email: string;
  entitlements: Entitlement[];
  goals: GoalHighlight[];
  notes: NoteHighlight[];
};

export default function ProfileClient({ profile, email, entitlements, goals, notes }: Props) {
  const initial = useMemo(
    () => ({
      display_name: profile?.display_name?.trim() ?? "",
      country: profile?.country?.trim() ?? "",
      city: profile?.city?.trim() ?? "",
      document_type: profile?.document_type?.trim() ?? "",
      document_number: profile?.document_number?.trim() ?? "",
      whatsapp: profile?.whatsapp?.trim() ?? "",
    }),
    [profile?.city, profile?.country, profile?.display_name, profile?.document_number, profile?.document_type, profile?.whatsapp],
  );

  const [form, setForm] = useState(initial);
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
        : [
            { product: "retos", active: false },
            { product: "agenda", active: false },
          ],
    [entitlements],
  );

  const hasProfileChanges = useMemo(() => {
    const nameChanged = initial.display_name !== form.display_name.trim();
    const countryChanged = initial.country.toUpperCase() !== form.country.trim().toUpperCase();
    const cityChanged = initial.city !== form.city.trim();
    const docTypeChanged = initial.document_type.toUpperCase() !== form.document_type.trim().toUpperCase();
    const docNumberChanged = initial.document_number !== form.document_number.trim();
    const whatsappChanged = initial.whatsapp !== form.whatsapp.trim();
    return nameChanged || countryChanged || cityChanged || docTypeChanged || docNumberChanged || whatsappChanged;
  }, [
    form.display_name,
    form.country,
    form.city,
    form.document_type,
    form.document_number,
    form.whatsapp,
    initial.display_name,
    initial.country,
    initial.city,
    initial.document_type,
    initial.document_number,
    initial.whatsapp,
  ]);

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

      const trimmedCountry = form.country.trim();
      if (trimmedCountry !== initial.country) {
        payload.country = trimmedCountry ? trimmedCountry.toUpperCase() : "";
      }

      const trimmedCity = form.city.trim();
      if (trimmedCity !== initial.city) {
        payload.city = trimmedCity;
      }

      const trimmedDocType = form.document_type.trim();
      if (trimmedDocType !== initial.document_type) {
        payload.document_type = trimmedDocType ? trimmedDocType.toUpperCase() : "";
      }

      const trimmedDocNumber = form.document_number.trim();
      if (trimmedDocNumber !== initial.document_number) {
        payload.document_number = trimmedDocNumber;
      }

      const trimmedWhatsapp = form.whatsapp.trim();
      if (trimmedWhatsapp !== initial.whatsapp) {
        payload.whatsapp = trimmedWhatsapp;
      }

      if (!hasProfileChanges) {
        setProfileMessage("No hay cambios para guardar.");
        return;
      }

      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
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
      if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        throw new Error("La nueva contraseña debe tener al menos 10 caracteres, letras y números.");
      }
      const res = await fetch("/api/me/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body?.error === "invalid_current_password") {
          throw new Error("La contraseña actual no es correcta.");
        }
        if (body?.error === "invalid_payload") {
          throw new Error("Revisa los requisitos de la nueva contraseña.");
        }
        if (body?.error === "update_failed") {
          throw new Error("No pudimos cambiar la contraseña en este momento.");
        }
        throw new Error(body?.error ?? "No se pudo cambiar la contraseña.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("¡Contraseña cambiada! Por seguridad, cierra sesión y vuelve a entrar.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Error desconocido al cambiar la contraseña.");
    } finally {
      setSavingPassword(false);
    }
  }

  const formattedGoals = goals.slice(0, 6);
  const formattedNotes = notes.slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-white/70 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-mana-primary">Tu perfil</h1>
          <p className="text-sm text-mana-primary/70">Gestiona tus datos y repasa tus avances personales.</p>
        </div>
        <Button asChild variant="secondary" className="border-mana-primary/20 text-mana-primary hover:bg-mana-primary hover:text-white">
          <Link href="/">← Volver al inicio</Link>
        </Button>
      </div>

      <section className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs">
        <h2 className="text-lg font-semibold text-mana-primary">Datos de contacto</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))}
              placeholder="CO"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Ciudad
            <input
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder="Medellín"
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
            Tipo documento
            <input
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={form.document_type}
              onChange={(event) => setForm((prev) => ({ ...prev, document_type: event.target.value.toUpperCase() }))}
              placeholder="CC, CE, NIT..."
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Número documento
            <input
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={form.document_number}
              onChange={(event) => setForm((prev) => ({ ...prev, document_number: event.target.value }))}
              placeholder="1234567890"
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
      </section>

      <section className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs md:max-w-xl">
        <h2 className="text-lg font-semibold text-mana-primary">Seguridad</h2>
        <p className="text-sm text-mana-primary/70">Actualiza tu contraseña cuando lo necesites.</p>
        <div className="mt-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Contraseña actual
            <input
              type="password"
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-mana-primary/70">
            Nueva contraseña
            <input
              type="password"
              className="mt-1 w-full rounded-full border border-mana-primary/20 px-4 py-2 text-sm"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={submitPassword} disabled={savingPassword}>
            {savingPassword ? "Actualizando…" : "Actualizar contraseña"}
          </Button>
          {passwordMessage && <span className="text-sm text-emerald-600">{passwordMessage}</span>}
          {passwordError && <span className="text-sm text-red-600">{passwordError}</span>}
        </div>
      </section>

      <section className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs">
        <h2 className="text-lg font-semibold text-mana-primary">Tus accesos</h2>
        <p className="text-sm text-mana-primary/70">Productos activos para {email}.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {entitlementList.map((item) => (
            <div key={item.product} className="rounded-lg border border-mana-primary/15 bg-white px-4 py-3 shadow-xs">
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

      <section className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mana-primary">Metas del plan personal</h2>
            <p className="text-sm text-mana-primary/70">Sincronizadas con la sección de metas dentro del reto.</p>
          </div>
          <Button asChild variant="secondary" className="border-mana-primary/20 text-mana-primary hover:bg-mana-primary hover:text-white">
            <Link href="/">Ir a Mis Metas</Link>
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {formattedGoals.length === 0 && <div className="text-sm text-mana-primary/60">Aún no has creado metas en tu plan personal.</div>}
          {formattedGoals.map((goal) => (
            <div key={goal.id} className="rounded-lg border border-mana-primary/15 bg-white/90 px-4 py-3">
              <div className="flex items-center justify-between text-sm font-semibold text-mana-primary">
                <span>{goal.title}</span>
                {goal.area && <span className="text-xs uppercase tracking-wide text-mana-primary/60">{goal.area}</span>}
              </div>
              {goal.detail && <p className="mt-1 text-sm text-mana-primary/70">{goal.detail}</p>}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-mana-primary/60">
                {goal.targetDate && <span>Fecha objetivo: {goal.targetDate}</span>}
                {goal.completed !== undefined && <span>{goal.completed ? "Completada" : "En progreso"}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-mana-primary/10 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-mana-primary">Notas recientes</h2>
            <p className="text-sm text-mana-primary/70">Estas entradas vienen de tu diario en la app.</p>
          </div>
          <Button asChild variant="secondary" className="border-mana-primary/20 text-mana-primary hover:bg-mana-primary hover:text-white">
            <Link href="/">Abrir Diario</Link>
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {formattedNotes.length === 0 && <div className="text-sm text-mana-primary/60">Todavía no has escrito notas.</div>}
          {formattedNotes.map((note) => (
            <div key={note.date + note.text.slice(0, 12)} className="rounded-lg border border-mana-primary/15 bg-white/90 px-4 py-3 text-sm text-mana-primary/80">
              <div className="text-xs font-semibold uppercase tracking-wide text-mana-primary/60">
                {new Date(note.date).toLocaleDateString()}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{note.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
