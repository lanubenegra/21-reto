import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import authOptions from "@/auth.config";
import { supabaseServer } from "@/lib/supabase/server";
import { getUserState } from "@/lib/server/state-store";
import type { PersonalTask, UserState } from "@/lib/user-state";
import ProfileClient, { type GoalHighlight, type NoteHighlight } from "./ProfileClient";
import { normalizeEmail } from "@/lib/email";

const fallbackGoalId = () => `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const sanitizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const buildGoalHighlights = (state: UserState): GoalHighlight[] => {
  const highlights: GoalHighlight[] = [];
  const seen = new Set<string>();

  (state.goals ?? []).forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const source = raw as Record<string, unknown>;
    const id = typeof source.id === "string" && source.id.trim() ? source.id : fallbackGoalId();
    if (seen.has(id)) return;

    const objective = sanitizeText(source.objective);
    const goal = sanitizeText(source.goal);
    const indicator = sanitizeText(source.indicator);
    const action = sanitizeText(source.action);
    const title = objective || goal || indicator || action;
    if (!title) return;

    highlights.push({
      id,
      title,
      detail: goal && goal !== title ? goal : indicator || action || null,
      area: typeof source.area === "string" ? source.area : undefined,
      targetDate: typeof source.targetDate === "string" ? source.targetDate : undefined,
    });
    seen.add(id);
  });

  (state.personalTasks ?? []).forEach((task: PersonalTask) => {
    if (task.category !== "goal") return;
    const title = sanitizeText(task.description);
    if (!title) return;
    const id = task.id || fallbackGoalId();
    if (seen.has(id)) return;
    highlights.push({
      id,
      title,
      detail: task.notes ?? null,
      area: task.area ?? undefined,
      targetDate: task.targetDate ?? undefined,
      completed: task.completed ?? false,
    });
    seen.add(id);
  });

  return highlights;
};

const buildNoteHighlights = (state: UserState): NoteHighlight[] => {
  const entries = state.diary ?? [];
  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      date: typeof entry.date === "string" ? entry.date : new Date().toISOString(),
      text: sanitizeText(entry.text) || "(Sin contenido)",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
};

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/signin?mode=login");
  }

  const supabase = await supabaseServer();
  const user = session.user;
  if (!user?.id) {
    redirect("/auth/signin?mode=login");
  }
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, country, city, document_type, document_number, whatsapp, role, created_at, email")
    .eq("id", userId)
    .maybeSingle();

  const rawEmail = user.email ?? profile?.email ?? "";
  const normalizedEmail = normalizeEmail(rawEmail);
  const email = normalizedEmail || rawEmail;

  const { data: entitlementsData } = await supabase
    .from("entitlements")
    .select("product, active, created_at")
    .or(
      [
        `user_id.eq.${userId}`,
        normalizedEmail ? `email.eq.${normalizedEmail}` : null,
      ]
        .filter(Boolean)
        .join(","),
    )
    .order("product");

  const entitlements = (entitlementsData ?? []).map((item) => ({
    product: item.product,
    active: item.active,
    created_at: item.created_at,
  }));

  const defaultName =
    profile?.display_name?.trim() ??
    (user.name?.trim() ?? "") ??
    (email ? email.split("@")[0] : "");

  const state = await getUserState(userId, email);
  const goals = buildGoalHighlights(state);
  const notes = buildNoteHighlights(state);

  return (
    <main className="min-h-[calc(100vh-120px)] bg-mana-surface/50 px-4 py-10">
      <ProfileClient
        profile={profile ?? null}
        email={email}
        entitlements={entitlements}
        goals={goals}
        notes={notes}
        defaultName={defaultName}
      />
    </main>
  );
}
