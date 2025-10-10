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

export async function GET() {
  const supabase = createSupabaseServer();
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
  const body = JSON.parse(text) as any;

  const supabase = createSupabaseServer();
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

  switch (body.action) {
    case "save_assessment": {
      const { kind, values } = body;
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
      const { day, notes, payload, completed = true, entry_date } = body;
      if (typeof day !== "number" || day < 1 || day > todayDay) {
        return NextResponse.json({ message: "Día no permitido" }, { status: 400 });
      }
      const { error } = await supabase.from("challenge_entries").upsert(
        {
          user_id: user.id,
          day,
          notes,
          payload,
          completed,
          entry_date: entry_date ?? new Date().toISOString().slice(0, 10),
        },
        { onConflict: "user_id,day" }
      );
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "save_budget_month": {
      const { month, income = 0, allocations = {}, notes = null } = body;
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
      const { month, category, subcategory = null, amount, description = null } = body;
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
      const { body: textBody } = body;
      const { error } = await supabase.from("journal").insert({ user_id: user.id, body: textBody });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "create_goal": {
      const {
        area,
        strategic_objective,
        focused_goal,
        indicator,
        frequency = "daily",
        hour = null,
        motivation = null,
        action_plan = null,
      } = body;
      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        area,
        strategic_objective,
        focused_goal,
        indicator,
        frequency,
        hour,
        motivation,
        action_plan,
      });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    case "log_goal": {
      const { goal_id, log_date = new Date().toISOString().slice(0, 10), completed = true, notes = null } = body;
      const { error } = await supabase.from("goal_logs").insert({ goal_id, log_date, completed, notes });
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ message: "Acción no soportada" }, { status: 400 });
  }
}
