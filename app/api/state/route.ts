import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

const MAX_BODY = 100_000;

function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";
  if (!origin || !host) return;
  const u = new URL(origin);
  if (u.host !== host) throw new Error("forbidden");
}

function dayNumber(programStartDate: string | Date) {
  const start = new Date(programStartDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((+today - +start) / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diff + 1, 1), 21);
}

function computeStreak(sortedDays: number[]) {
  let s = 0;
  for (let i = 1; i <= 21; i++) {
    if (sortedDays.includes(i)) s++;
    else break;
  }
  return s;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,country,program_start_date,signature")
    .eq("id", user.id)
    .maybeSingle();

  const start = profile?.program_start_date ?? new Date().toISOString().slice(0, 10);
  const todayDay = dayNumber(start);

  const { data: assessments } = await supabase.from("assessments").select("*").eq("user_id", user.id);

  const { data: entries } = await supabase
    .from("challenge_entries")
    .select("day,entry_date,completed")
    .eq("user_id", user.id);

  const completedDays = (entries ?? []).filter((e) => e.completed).map((e) => e.day);
  const streak = computeStreak([...new Set(completedDays)].sort((a, b) => a - b));

  const ym = new Date();
  const month = `${ym.getFullYear()}-${String(ym.getMonth() + 1).padStart(2, "0")}`;
  const { data: bm } = await supabase
    .from("budget_months")
    .select("id,month,income,allocations,notes")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  const { data: bentries } = bm
    ? await supabase.from("budget_entries").select("*").eq("month_id", bm.id)
    : { data: [] };

  const { data: journal } = await supabase
    .from("journal")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    profile,
    todayDay,
    streak,
    completedCount: completedDays.length,
    assessments: assessments ?? [],
    budget: bm ? { ...bm, entries: bentries ?? [] } : null,
    journal: journal ?? [],
  });
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY) return NextResponse.json({ message: "Payload demasiado grande" }, { status: 413 });
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed)) {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
  }
  const actionValue = parsed.action;
  if (typeof actionValue !== "string") {
    return NextResponse.json({ message: "Acción no soportada" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("program_start_date")
    .eq("id", user.id)
    .maybeSingle();
  const todayDay = dayNumber(profile?.program_start_date ?? new Date().toISOString().slice(0, 10));

  switch (actionValue) {
    case "save_assessment": {
      const kind = parsed.kind;
      if (typeof kind !== "string") {
        return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
      }
      const values = parsed.values ?? null;
      const { error } = await supabase.from("assessments").upsert(
        {
          user_id: user.id,
          kind,
          values,
        },
        { onConflict: "user_id,kind" }
      );
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "upsert_challenge": {
      const { day, notes, payload } = parsed;
      const completed = typeof parsed.completed === "boolean" ? parsed.completed : true;
      const entryDate = typeof parsed.entry_date === "string" ? parsed.entry_date : undefined;
      if (typeof day !== "number" || day < 1 || day > todayDay) {
        return NextResponse.json({ message: "Día no permitido" }, { status: 400 });
      }
      const { error } = await supabase.from("challenge_entries").upsert(
        {
          user_id: user.id,
          day,
          notes: typeof notes === "string" ? notes : null,
          payload,
          completed,
          entry_date: entryDate ?? new Date().toISOString().slice(0, 10),
        },
        { onConflict: "user_id,day" }
      );
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "save_budget_month": {
      const month = parsed.month;
      if (typeof month !== "string") {
        return NextResponse.json({ message: "Mes inválido" }, { status: 400 });
      }
      const income = typeof parsed.income === "number" ? parsed.income : 0;
      const allocations = isRecord(parsed.allocations) ? parsed.allocations : {};
      const notes = typeof parsed.notes === "string" ? parsed.notes : null;
      const { error } = await supabase.from("budget_months").upsert(
        {
          user_id: user.id,
          month,
          income,
          allocations,
          notes,
        },
        { onConflict: "user_id,month" }
      );
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "add_budget_entry": {
      const month = parsed.month;
      const category = parsed.category;
      const amount = parsed.amount;
      if (typeof month !== "string" || typeof category !== "string" || typeof amount !== "number") {
        return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
      }
      const subcategory =
        typeof parsed.subcategory === "string" || parsed.subcategory === null ? parsed.subcategory : null;
      const description =
        typeof parsed.description === "string" || parsed.description === null ? parsed.description : null;
      const { data: bm } = await supabase
        .from("budget_months")
        .select("id")
        .eq("user_id", user.id)
        .eq("month", month)
        .maybeSingle();
      if (!bm) return NextResponse.json({ message: "Mes no encontrado" }, { status: 400 });
      const { error } = await supabase.from("budget_entries").insert({
        month_id: bm.id,
        category,
        subcategory,
        amount,
        description,
      });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "add_journal": {
      const textBody = parsed.body;
      if (typeof textBody !== "string" || !textBody.trim()) {
        return NextResponse.json({ message: "Entrada inválida" }, { status: 400 });
      }
      const { error } = await supabase.from("journal").insert({ user_id: user.id, body: textBody });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "create_goal": {
      const area = parsed.area;
      const strategicObjective = parsed.strategic_objective;
      const focusedGoal = parsed.focused_goal;
      const indicator = parsed.indicator;
      if (
        typeof area !== "string" ||
        typeof strategicObjective !== "string" ||
        typeof focusedGoal !== "string" ||
        typeof indicator !== "string"
      ) {
        return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
      }
      const frequency = typeof parsed.frequency === "string" ? parsed.frequency : "daily";
      const hour = typeof parsed.hour === "string" ? parsed.hour : null;
      const motivation = typeof parsed.motivation === "string" ? parsed.motivation : null;
      const actionPlan = typeof parsed.action_plan === "string" ? parsed.action_plan : null;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        area,
        strategic_objective: strategicObjective,
        focused_goal: focusedGoal,
        indicator,
        frequency,
        hour,
        motivation,
        action_plan: actionPlan,
      });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "log_goal": {
      const goalId = parsed.goal_id;
      if (typeof goalId !== "string") {
        return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
      }
      const logDate =
        typeof parsed.log_date === "string" ? parsed.log_date : new Date().toISOString().slice(0, 10);
      const completed = typeof parsed.completed === "boolean" ? parsed.completed : true;
      const notes = typeof parsed.notes === "string" ? parsed.notes : null;
      const { error } = await supabase.from("goal_logs").insert({ goal_id: goalId, log_date: logDate, completed, notes });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ message: "Acción no soportada" }, { status: 400 });
  }
}
