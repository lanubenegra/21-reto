'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Flame, Home, BookOpen, CalendarDays, BarChart2, ClipboardList, NotebookPen, CheckCircle2, Play, Pause, ShieldCheck, Signature, Plus, Check, Trash2, Search, X, ChevronLeft, ChevronRight, HeartHandshake, LogIn, Lock } from "lucide-react";
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import AuthMenu from "@/components/auth/AuthMenu";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { BudgetCategoryKey, BudgetEntry, BudgetMonth, BudgetState, PersonalTask, TaskFrequency, UserState } from "@/lib/user-state";
import { emptyBudgetState } from "@/lib/user-state";
import { cn } from "@/lib/utils";
import { getBibleBooksMetadata, getBibleChapterContent, parseReference, type BibleBookSummary, type NormalizedPassage } from "@/lib/rvr1960";

// =====================
// Utilidades y datos base
// =====================
const AREAS = [
  { key: "spiritual", name: "Espiritual", color: "#6D5EF9" },
  { key: "mental", name: "Mental", color: "#06B6D4" },
  { key: "emotional", name: "Emocional", color: "#F43F5E" },
  { key: "physical", name: "Física", color: "#22C55E" },
  { key: "financial", name: "Financiera", color: "#F59E0B" },
  { key: "work", name: "Laboral", color: "#64748B" },
  { key: "relational", name: "Relacional", color: "#8B5CF6" },
] as const;

const BUDGET_CATEGORIES: Array<{
  key: BudgetCategoryKey;
  name: string;
  recommended: number;
  color: string;
  description: string;
  subcategories: string[];
}> = [
  {
    key: "generosity",
    name: "Diezmo y generosidad",
    recommended: 10,
    color: "#F59E0B",
    description: "Honra al Señor con lo primero de tus ingresos (Prov. 3:9).",
    subcategories: ["Diezmo", "Ofrendas", "Misiones", "Ayuda social"],
  },
  {
    key: "essentials",
    name: "Gastos esenciales",
    recommended: 45,
    color: "#2563EB",
    description: "Vivienda, alimentación, transporte y salud. Si supera el 45 %, considera ajustar.",
    subcategories: ["Vivienda", "Alimentación", "Transporte", "Salud", "Servicios públicos"],
  },
  {
    key: "debt_savings",
    name: "Deudas y ahorro",
    recommended: 25,
    color: "#0891B2",
    description: "Cancela deudas con diligencia y construye un fondo de emergencia.",
    subcategories: ["Pago de deudas", "Ahorro emergencia", "Ahorro futuro", "Inversión"],
  },
  {
    key: "growth",
    name: "Ocio, educación y desarrollo",
    recommended: 20,
    color: "#8B5CF6",
    description: "Dios también desea que disfrutes y sigas creciendo.",
    subcategories: ["Educación", "Ocio", "Desarrollo personal", "Familia", "Viajes"],
  },
] as const;

const createBudgetAllocations = () =>
  BUDGET_CATEGORIES.reduce<Record<BudgetCategoryKey, number>>((acc, category) => {
    acc[category.key] = category.recommended;
    return acc;
  }, {} as Record<BudgetCategoryKey, number>);

type AreaKey = (typeof AREAS)[number]["key"];

type InteractionType =
  | "timer+note"
  | "two-fields"
  | "date+reason"
  | "declaration+verse"
  | "place-select"
  | "negative+scripture"
  | "mini-quiz"
  | "habit+reminder"
  | "healing-letter"
  | "service-check"
  | "goals-table"
  | "mini-budget"
  | "cut+reinvest"
  | "petitions+verse"
  | "friends+action"
  | "relation-skill"
  | "health-daily"
  | "menu+gratitude"
  | "rest-choice"
  | "matrix-table"
  | "signature+certificate";

interface ChallengeDefinition {
  day: number;
  title: string;
  verse?: string;
  youtubeId?: string;
  interaction: InteractionType;
  areas: Partial<Record<AreaKey, number>>;
  area: string;
  contenidoDevocional: string;
  queAprendi: string;
  deseoAlcanzar: string;
  deseoConservar: string;
  deseoEvitar: string;
  deseoEliminar: string;
  consejoMana: string;
  resumen: string;
  instrucciones: string;
}

type ChallengeScalar = string | number | boolean | null | undefined;

type MatrixEntry = {
  obj?: string;
  goal?: string;
  ind?: string;
  indicator?: string;
  date?: string;
  first?: string;
};

type FriendInfo = {
  name?: string;
  contact?: string;
  action?: string;
};

interface ChallengePayload {
  seconds?: number;
  chapter?: string;
  verse?: string;
  date?: string;
  reason?: string;
  declaration?: string;
  backVerse?: string;
  place?: string;
  commit?: boolean;
  negative?: string;
  scripture?: string;
  changed?: string;
  decision?: string;
  habit?: string;
  action?: string;
  reminder?: boolean;
  content?: string;
  help?: boolean;
  teach?: boolean;
  call?: boolean;
  income?: string;
  expenses?: string;
  to_cut?: string;
  reinvest?: string;
  req1?: string;
  req2?: string;
  req3?: string;
  friends?: FriendInfo[];
  skill?: string;
  sleep?: string;
  exercise?: string;
  mood?: string;
  menu?: string;
  gratitude?: string;
  rest?: string;
  signed?: boolean;
  aprendi?: string;
  deseoAlcanzarPersonal?: string;
  deseoConservarPersonal?: string;
  deseoEvitarPersonal?: string;
  deseoEliminarPersonal?: string;
  [key: string]: ChallengeScalar | MatrixEntry | FriendInfo[] | undefined;
}

interface ChallengeEntry {
  payload: ChallengePayload;
  note?: string;
  date: string;
}

type EntriesMap = Partial<Record<number, ChallengeEntry>>;

type AssessMap = Record<AreaKey, number>;

interface DiaryEntry {
  date: string;
  text: string;
}

type GoalFrequency = "daily" | "weekly" | "monthly";
type GoalMotivation = "intrinsic" | "extrinsic";

interface Goal {
  id: string;
  area: AreaKey;
  objective: string;
  goal: string;
  indicator: string;
  frequency: GoalFrequency;
  hour: string;
  motivation: GoalMotivation;
  action: string;
}

interface GoalLog {
  goalId: string;
  date: string;
  completed: boolean;
}

type TabKey = "home" | "today" | "retos" | "plan" | "budget" | "journal" | "commit";

type CompleteHandler = (day: number, payload: ChallengePayload, note?: string) => void;

type GoalDraft = Omit<Goal, "id">;

interface TodayChallengeProps {
  selectedDay: number;
  setSelectedDay: (n: number) => void;
  onCompleted: CompleteHandler;
  entries: EntriesMap;
  onOpenReference: (reference: string) => void;
  canAccess: boolean;
}

interface InteractionProps {
  type: InteractionType;
  payload: ChallengePayload;
  setPayload: React.Dispatch<React.SetStateAction<ChallengePayload>>;
}

interface GoalsSectionProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  goalLogs: GoalLog[];
  setGoalLogs: React.Dispatch<React.SetStateAction<GoalLog[]>>;
}

interface ProgressCalendarProps {
  completedDays: number[];
  planStartDate: string | null;
  onOpenDay: (dayNumber: number) => void;
  onRestartPlan?: () => void;
  variant?: "full" | "compact";
  selectedDay?: number;
}

interface BudgetPlannerProps {
  budgetState: BudgetState;
  setBudgetState: React.Dispatch<React.SetStateAction<BudgetState>>;
  onOpenReference?: (reference: string) => void;
}

interface PersonalPlanSectionProps {
  tasks: PersonalTask[];
  setTasks: React.Dispatch<React.SetStateAction<PersonalTask[]>>;
}

interface JournalSectionProps {
  diary: DiaryEntry[];
  setDiary: React.Dispatch<React.SetStateAction<DiaryEntry[]>>;
}

interface CommitmentSectionProps {
  signature: string | null;
  setSignature: React.Dispatch<React.SetStateAction<string | null>>;
  setTab: React.Dispatch<React.SetStateAction<TabKey>>;
  setFinalAssess: React.Dispatch<React.SetStateAction<AssessMap>>;
  areaScores: AssessMap;
}

const day = (n: number) => n;

const isoDateString = (date: Date) => date.toISOString().slice(0, 10);

const startOfLocalDay = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDaysToDate = (value: Date, amount: number) => {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const parsePlanStartDate = (raw: string | null) => {
  if (!raw) return startOfLocalDay(new Date());
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match) {
    const [, y, m, d] = match;
    return startOfLocalDay(new Date(Number(y), Number(m) - 1, Number(d)));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return startOfLocalDay(new Date());
  return startOfLocalDay(parsed);
};

const normalizePlanStartString = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  return isoDateString(parsePlanStartDate(raw));
};

const parseISODate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfLocalDay(date);
};

const sanitizeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
};

const normalizeBudgetAllocations = (input: unknown): Record<BudgetCategoryKey, number> => {
  const base = createBudgetAllocations();
  if (!input || typeof input !== "object") return base;
  const raw = input as Record<string, unknown>;
  BUDGET_CATEGORIES.forEach(category => {
    const rawValue = raw[category.key];
    if (typeof rawValue === "number" || typeof rawValue === "string") {
      base[category.key] = clampPercent(sanitizeNumber(rawValue, category.recommended));
    }
  });
  return base;
};

const normalizeBudgetEntries = (entries: unknown, month: string): BudgetEntry[] => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const category = source.category;
      if (category !== "generosity" && category !== "essentials" && category !== "debt_savings" && category !== "growth") {
        return null;
      }
      const amount = sanitizeNumber(source.amount, 0);
      if (amount <= 0) return null;
      const entryMonth = typeof source.month === "string" ? source.month : month;
      return {
        id: typeof source.id === "string" ? source.id : cryptoRandomId(),
        month: entryMonth,
        category: category as BudgetCategoryKey,
        subcategory: typeof source.subcategory === "string" ? source.subcategory : null,
        amount,
        description: typeof source.description === "string" ? source.description : null,
        createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
      } as BudgetEntry;
    })
    .filter((entry): entry is BudgetEntry => entry !== null);
};

const createBudgetMonthState = (month: string): BudgetMonth => ({
  month,
  income: 0,
  allocations: createBudgetAllocations(),
  entries: [],
  notes: null,
});

const normalizeBudgetMonth = (monthKey: string, raw: unknown): BudgetMonth => {
  if (!raw || typeof raw !== "object") return createBudgetMonthState(monthKey);
  const source = raw as Record<string, unknown>;
  const income = sanitizeNumber(source.income, 0);
  const allocations = normalizeBudgetAllocations(source.allocations);
  const entries = normalizeBudgetEntries(source.entries, monthKey);
  return {
    month: monthKey,
    income,
    allocations,
    entries,
    notes: typeof source.notes === "string" ? source.notes : null,
  };
};

const normalizeBudgetState = (raw: unknown): BudgetState => {
  const fallback = emptyBudgetState();
  if (!raw || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;
  const activeMonth = typeof source.activeMonth === "string" ? source.activeMonth : fallback.activeMonth;
  const monthsRaw = source.months;
  const months: Record<string, BudgetMonth> = {};

  if (monthsRaw && typeof monthsRaw === "object") {
    Object.entries(monthsRaw as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof key === "string") {
        months[key] = normalizeBudgetMonth(key, value);
      }
    });
  }

  if (!Object.keys(months).length) {
    const month = activeMonth || fallback.activeMonth;
    months[month] = createBudgetMonthState(month);
  }

  const ensuredActive = months[activeMonth] ? activeMonth : Object.keys(months)[0];

  return {
    activeMonth: ensuredActive,
    months,
  };
};

const normalizePersonalTasks = (input: unknown): PersonalTask[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      if (typeof source.id !== "string" || typeof source.description !== "string" || typeof source.category !== "string") {
        return null;
      }
      return {
        id: source.id,
        category: source.category as PersonalTask["category"],
        description: source.description,
        frequency: (source.frequency as PersonalTask["frequency"]) ?? "once",
        createdAt: typeof source.createdAt === "string" ? source.createdAt : new Date().toISOString(),
        area: typeof source.area === "string" ? source.area : null,
        targetDate: typeof source.targetDate === "string" ? source.targetDate : null,
        completed: Boolean(source.completed),
        completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
        lastCompletedAt: typeof source.lastCompletedAt === "string" ? source.lastCompletedAt : null,
        dayOfWeek: typeof source.dayOfWeek === "number" ? source.dayOfWeek : null,
        dayOfMonth: typeof source.dayOfMonth === "number" ? source.dayOfMonth : null,
        amount: typeof source.amount === "number" ? source.amount : null,
        notes: typeof source.notes === "string" ? source.notes : null,
      } as PersonalTask;
    })
    .filter((item): item is PersonalTask => item !== null);
};

const isAreaKey = (value: unknown): value is AreaKey =>
  typeof value === "string" && AREAS.some(area => area.key === value);

const normalizeGoals = (input: unknown): Goal[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const id = typeof source.id === "string" && source.id.trim() ? source.id : cryptoRandomId();
      const area = isAreaKey(source.area) ? source.area : "spiritual";
      const frequency =
        source.frequency === "weekly" || source.frequency === "monthly" ? source.frequency : "daily";
      const motivation = source.motivation === "extrinsic" ? "extrinsic" : "intrinsic";
      const hour = typeof source.hour === "string" ? source.hour : "06:00";
      const objective = stringValue(source.objective);
      const goal = stringValue(source.goal);
      const indicator = stringValue(source.indicator);
      const action = stringValue(source.action);
      if (!objective && !goal && !indicator) return null;
      return {
        id,
        area,
        objective,
        goal,
        indicator,
        frequency,
        hour,
        motivation,
        action,
      } as Goal;
    })
    .filter((item): item is Goal => item !== null);
};

const normalizeEntries = (input: unknown): EntriesMap => {
  if (!input || typeof input !== "object") return {};
  const result: EntriesMap = {};
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const dayNumber = Number(key);
    if (!Number.isInteger(dayNumber)) return;
    if (!value || typeof value !== "object") return;
    const source = value as Record<string, unknown>;
    const payload = normalizePayload(source.payload as ChallengePayload);
    const date = typeof source.date === "string" ? source.date : isoDateString(new Date());
    const note = typeof source.note === "string" ? source.note : undefined;
    result[dayNumber] = note ? { payload, date, note } : { payload, date };
  });
  return result;
};

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
] as const;

const weekOptionToJsDay = (value: number) => (value % 7);
const jsDayToWeekOption = (value: number) => (value === 0 ? 7 : value);
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

const createBaselineAssess = (value = 5): AssessMap =>
  AREAS.reduce((acc, area) => {
    acc[area.key] = value;
    return acc;
  }, {} as AssessMap);

const normalizePayload = (value?: ChallengePayload): ChallengePayload =>
  value && typeof value === "object" ? value : {};

const stringValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

const numberValue = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const booleanValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  if (typeof value === "number") return value !== 0;
  return fallback;
};

const friendListValue = (value: unknown): FriendInfo[] =>
  Array.isArray(value)
    ? value.filter((item): item is FriendInfo => !!item && typeof item === "object")
    : [];

const matrixEntryValue = (value: unknown): MatrixEntry =>
  value && typeof value === "object" ? (value as MatrixEntry) : {};

const TIMER_PREVIEW_SECONDS = 900;

const createGoalDraft = (): GoalDraft => ({
  area: "spiritual",
  objective: "",
  goal: "",
  indicator: "",
  frequency: "daily",
  hour: "06:00",
  motivation: "intrinsic",
  action: "",
});

const INTERACTION_LABELS: Record<InteractionType, string> = {
  "timer+note": "Temporizador y nota personal",
  "two-fields": "Registro de pasaje bíblico",
  "date+reason": "Fecha y motivo especial",
  "declaration+verse": "Declaración con respaldo bíblico",
  "place-select": "Elección de lugar de conexión",
  "negative+scripture": "Pensamiento vs. Escritura",
  "mini-quiz": "Autoevaluación rápida",
  "habit+reminder": "Diseño de hábito con recordatorio",
  "healing-letter": "Carta de sanidad interior",
  "service-check": "Checklist de servicio",
  "goals-table": "Tabla de metas por área",
  "mini-budget": "Mini presupuesto",
  "cut+reinvest": "Recorte y reinversión",
  "petitions+verse": "Peticiones con promesa",
  "friends+action": "Plan con amigos",
  "relation-skill": "Habilidad relacional",
  "health-daily": "Bitácora de salud diaria",
  "menu+gratitude": "Menú y gratitud",
  "rest-choice": "Elección de descanso",
  "matrix-table": "Matriz de proyectos",
  "signature+certificate": "Firma de compromiso",
};

const WORSHIP_TRACK = "/audio/adoracion-15min.mp3";
const AREA_PROGRESS_STEPS: Record<AreaKey, number> = {
  spiritual: 0.92,
  mental: 2.04,
  emotional: 1.69,
  physical: 2.27,
  financial: 2.27,
  work: 1.0,
  relational: 1.69,
};

type HighlightMap = Record<number, number[] | "all">;

type HighlightContext = {
  bookAbbrev: string;
  chapters: HighlightMap;
};

const buildHighlightMap = (passages: NormalizedPassage[], targetBook: string): HighlightMap => {
  const map: HighlightMap = {};

  for (const passage of passages) {
    if (passage.bookAbbrev !== targetBook) continue;
    if (!passage.verses || passage.verses.length === 0) {
      map[passage.chapter] = "all";
      continue;
    }
    const existing = map[passage.chapter];
    if (existing === "all") continue;
    const accumulator = new Set(existing ?? []);
    for (const range of passage.verses) {
      for (let verse = range.start; verse <= range.end; verse += 1) {
        accumulator.add(verse);
      }
    }
    map[passage.chapter] = Array.from(accumulator).sort((a, b) => a - b);
  }

  return map;
};

const SCRIPTURE_CANDIDATE_PATTERN =
  String.raw`\b(?:[1-3]?\s?(?:[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}\.?)(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}\.?)*\s*\d+(?::\d+(?:[-–]\d+)?)?(?:[-–]\d+)?(?:\s*,\s*\d+(?::\d+(?:[-–]\d+)?)?)*)`;

const sanitizeReferenceCandidate = (value: string): string =>
  value
    .replace(/^[\s"'“”¡¿(\[]+/, "")
    .replace(/[\s"'“”¡¿)\].,;:!?]+$/, "")
    .trim();

const renderWithScriptureLinks = (
  text: string,
  onOpen: (reference: string) => void,
): React.ReactNode[] => {
  if (!text) return [text];
  const nodes: React.ReactNode[] = [];
  const regex = new RegExp(SCRIPTURE_CANDIDATE_PATTERN, "giu");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = regex.lastIndex;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const rawMatch = match[0];
    const sanitized = sanitizeReferenceCandidate(rawMatch);
    if (sanitized) {
      try {
        parseReference(sanitized);
        nodes.push(
          <button
            key={`scripture-${start}-${end}`}
            type="button"
            className="inline font-semibold text-mana-primary underline underline-offset-2 hover:text-mana-primaryDark"
            onClick={() => onOpen(sanitized)}
          >
            {rawMatch.trim()}
          </button>,
        );
      } catch {
        nodes.push(rawMatch);
      }
    } else {
      nodes.push(rawMatch);
    }
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

// 21 retos con tipo de interacción y áreas impactadas (peso simple para MVP)
const CHALLENGES: ChallengeDefinition[] = [
  {
    day: day(1),
    title: "15 Minutos que Cambian Todo",
    verse: "Mt 6:6",
    youtubeId: "yIEU8Ptl1B0",
    interaction: "timer+note",
    areas: { spiritual: 2, mental: .5 },
    area: "Espiritual",
    contenidoDevocional: "Jesús nos recuerda que el Padre nos espera en lo secreto. Aparta quince minutos diarios para entrar a ese lugar, silenciar el ruido y permitir que su presencia reordene tu día. Ese espacio no es un ritual rápido, sino una cita que alimenta tu corazón y te da dirección.",
    queAprendi: "Cuando invierto tiempo a solas con Dios mi perspectiva se alinea con la suya.",
    deseoAlcanzar: "Establecer un hábito diario de oración íntima.",
    deseoConservar: "Mi deseo genuino de buscar la presencia de Dios cada mañana.",
    deseoEvitar: "La prisa que me hace pasar por alto la voz del Señor.",
    deseoEliminar: "Las excusas que me impiden agendar tiempo con Él.",
    consejoMana: "No negocies tu cita con Dios; allí se abren los caminos que todavía no ves.",
    resumen: "Reserva un espacio de 15 minutos de adoración íntima con Jesús.",
    instrucciones: "Busca un lugar tranquilo, reproduce la pista de adoración (o permanece en silencio), deja que el temporizador marque los 15 minutos y al terminar escribe lo que Dios te habló."
  },
  {
    day: day(2),
    title: "Lea Esto Todos los Días para Mantenerse Enfocado",
    verse: "Sal 119:105",
    youtubeId: "IJTwn9C29bE",
    interaction: "two-fields",
    areas: { spiritual: 1, mental: .5 },
    area: "Espiritual",
    contenidoDevocional: "El salmista declara que la Palabra es la lámpara que guía nuestros pasos. Cuando meditamos diariamente en ella, nuestra mente se alinea con la verdad y rechazamos la confusión. Escribe y repite el pasaje que Dios subraya hoy para que sea tu recordatorio constante.",
    queAprendi: "La Escritura me centra y me guarda enfocado en lo que Dios dijo.",
    deseoAlcanzar: "Grabar en mi corazón un versículo clave para esta temporada.",
    deseoConservar: "La disciplina de leer la Palabra con atención y reverencia.",
    deseoEvitar: "Leer sin permitir que la verdad transforme mis decisiones.",
    deseoEliminar: "Las distracciones que me hacen olvidar lo que Dios habló.",
    consejoMana: "Escribe el versículo en un lugar visible y léelo en voz alta varias veces al día.",
    resumen: "Declara cada día un versículo que enfoque tu mente en la verdad.",
    instrucciones: "Lee el pasaje completo, registra el capítulo y versículo que Dios resalta y repítelo en voz alta durante la jornada para mantener tu atención en la Palabra."
  },
  {
    day: day(3),
    title: "Cambie su Dieta una Vez a la Semana",
    verse: "1 Co 6:19-20",
    youtubeId: "J9j4QcmXzH4",
    interaction: "date+reason",
    areas: { spiritual: 1, physical: .5 },
    area: "Físico",
    contenidoDevocional: "El cuidado del cuerpo es un acto espiritual porque somos templo del Espíritu Santo. Cambiar tu dieta una vez a la semana te ayuda a disciplinar los deseos y a escuchar mejor lo que Dios quiere decir. Permite que este gesto concreto sea una ofrenda de obediencia y gratitud.",
    queAprendi: "Mi cuerpo responde a la dirección de Dios cuando lo trato con respeto.",
    deseoAlcanzar: "Incorporar un día de alimentación consciente que honre a Dios.",
    deseoConservar: "La convicción de que mi salud refleja mi vida espiritual.",
    deseoEvitar: "Compensar los excesos con decisiones impulsivas o culpabilidad.",
    deseoEliminar: "El desorden alimenticio que roba energía y enfoque.",
    consejoMana: "Planifica tu menú del día especial con anticipación y ora antes de comer.",
    resumen: "Aparta un día a la semana para honrar a Dios con tu alimentación.",
    instrucciones: "Elige el día y el motivo de tu ayuno o ajuste alimenticio, planea qué comerás con antelación y ofrécelo al Señor mientras evalúas cómo responde tu cuerpo."
  },
  {
    day: day(4),
    title: "Hay Algo que Dejar Este Año",
    verse: "Fil 3:13-14",
    youtubeId: "X9JQisqSIIo",
    interaction: "declaration+verse",
    areas: { mental: 1, spiritual: .5 },
    area: "Mental",
    contenidoDevocional: "Cada año Dios nos invita a soltar cargas que ya no aportan a nuestro propósito. Identificar aquello que debes dejar abre espacio para nuevas oportunidades y restauración. Escríbelo, entrégalo al Señor y toma una decisión valiente de caminar sin ese peso.",
    queAprendi: "Rendir lo que estorba abre espacio para que Dios traiga algo mejor.",
    deseoAlcanzar: "Renunciar a un hábito o relación que roba vida.",
    deseoConservar: "La libertad mental que siento al obedecer.",
    deseoEvitar: "Justificar aquello que Dios ya me pidió soltar.",
    deseoEliminar: "El apego que me mantiene atado al pasado.",
    consejoMana: "Habla con alguien de confianza que te acompañe en este proceso de renuncia.",
    resumen: "Identifica aquello que debes dejar y entrégalo al Señor.",
    instrucciones: "Escribe tu declaración de renuncia, respáldala con un versículo y proclámala cada día mientras das pasos concretos para soltar lo que estorba."
  },
  {
    day: day(5),
    title: "Visita Estos Lugares y Estarás Conectado",
    verse: "Heb 10:24-25",
    youtubeId: "q-E50EYyYiE",
    interaction: "place-select",
    areas: { spiritual: .5, relational: 1 },
    area: "Relacional",
    contenidoDevocional: "La fe crece en comunidad cuando compartimos espacios que nos apuntan a Cristo. Visitar los lugares de conexión cada semana te mantiene protegido, acompañado y enfocado. Decide hoy a dónde irás y prepárate para llegar con un corazón dispuesto a servir y recibir.",
    queAprendi: "Necesito la familia de la fe para mantenerme firme en mi llamado.",
    deseoAlcanzar: "Integrarme a un espacio de comunidad donde pueda crecer.",
    deseoConservar: "La apertura para recibir consejo y corrección con humildad.",
    deseoEvitar: "Aislarme cuando siento cansancio o vergüenza.",
    deseoEliminar: "El individualismo que me hace pensar que puedo solo.",
    consejoMana: "Agenda desde hoy tu visita y avisa a alguien para mantenerte responsable.",
    resumen: "Reconéctate con tu comunidad de fe durante esta semana.",
    instrucciones: "Selecciona el lugar donde te reunirás (iglesia, célula o mentoría), confirma tu asistencia con anticipación y comprométete a llegar con una actitud de servicio."
  },
  {
    day: day(6),
    title: "Cómo Ganar el Juego de los Dardos",
    verse: "Ef 6:16",
    youtubeId: "J0TRG83i-IE",
    interaction: "negative+scripture",
    areas: { mental: 1, emotional: .5 },
    area: "Mental",
    contenidoDevocional: "Los dardos del enemigo son pensamientos que buscan minar la identidad. Detén cada flecha identificándola y reemplazándola con la verdad bíblica. Así fortaleces tu mente y levantas un escudo de fe sobre tus emociones.",
    queAprendi: "La Escritura es la defensa que neutraliza los pensamientos tóxicos.",
    deseoAlcanzar: "Responder a cada mentira con una promesa de Dios.",
    deseoConservar: "La claridad mental que surge al meditar en la Palabra.",
    deseoEvitar: "Acoger ideas que me alejan del propósito del Señor.",
    deseoEliminar: "El diálogo interno negativo que alimenta el temor.",
    consejoMana: "Cuando aparezca el pensamiento, declara en voz alta el versículo que lo desmonta.",
    resumen: "Desactiva los dardos mentales con promesas de la Palabra.",
    instrucciones: "Escribe el pensamiento tóxico que te ataca, busca un versículo que lo sustituya y cada vez que vuelva la mentira declara la verdad en voz alta."
  },
  {
    day: day(7),
    title: "Cómo Cambiar el Pesimismo por Confianza",
    verse: "Ro 15:13",
    youtubeId: "6QcworkCgTg",
    interaction: "mini-quiz",
    areas: { mental: 1, emotional: .5 },
    area: "Emocional",
    contenidoDevocional: "El pesimismo roba energía y distorsiona la visión de Dios para tu vida. Cambiarlo por confianza implica revisar tus creencias, agradecer y proclamar esperanza. Practica una evaluación honesta y permite que el Espíritu renueve tu mente.",
    queAprendi: "El pesimismo se debilita cuando abrazo la esperanza que Dios ofrece.",
    deseoAlcanzar: "Cultivar una actitud de fe ante los retos diarios.",
    deseoConservar: "La gratitud por las victorias que ya he visto.",
    deseoEvitar: "Aceptar frases derrotistas como parte de mi identidad.",
    deseoEliminar: "La queja crónica que oscurece mis relaciones.",
    consejoMana: "Sustituye cada queja por una declaración de fe fundamentada en la Palabra.",
    resumen: "Evalúa tus pensamientos y abraza la esperanza de Dios.",
    instrucciones: "Responde el mini cuestionario, detecta el pensamiento pesimista predominante y escribe la decisión práctica que tomarás hoy para caminar en confianza."
  },
  {
    day: day(8),
    title: "Cazando los Gigantes de la Adicción",
    verse: "1 Co 10:13",
    youtubeId: "xyxan4cjy0c",
    interaction: "habit+reminder",
    areas: { spiritual: .5, mental: .5, emotional: .5, physical: .5 },
    area: "Emocional",
    contenidoDevocional: "Las adicciones se fortalecen en la oscuridad, pero se debilitan cuando las exponemos a la luz. Identifica tus detonantes, plantéales límites y busca ayuda espiritual y práctica. Dios te da poder para formar hábitos santos que sanan tu historia.",
    queAprendi: "Reconocer mis gatillos me permite diseñar estrategias de libertad.",
    deseoAlcanzar: "Establecer un nuevo hábito que reemplace la conducta adictiva.",
    deseoConservar: "La transparencia con Dios y con mi apoyo cercano.",
    deseoEvitar: "Situaciones que alimentan la tentación sin un plan previo.",
    deseoEliminar: "La vergüenza que me impide pedir ayuda.",
    consejoMana: "Comparte tu plan con un mentor y fija recordatorios para sostenerlo.",
    resumen: "Diseña un plan para vencer el gigante de la adicción.",
    instrucciones: "Describe el hábito que entregarás, la acción concreta que lo reemplazará y activa un recordatorio diario para mantenerte fiel a tu decisión."
  },
  {
    day: day(9),
    title: "Arme las Piezas de un Corazón Roto",
    verse: "Sal 147:3",
    youtubeId: "wEtv4RjlwtI",
    interaction: "healing-letter",
    areas: { emotional: 2 },
    area: "Emocional",
    contenidoDevocional: "El corazón roto se restaura cuando reconocemos el dolor y lo presentamos al Padre. Escribir una carta de sanidad te permite ordenar emociones, perdonar y liberar. Dios recoge cada pieza y promete hacer algo nuevo con lo que parecía perdido.",
    queAprendi: "Sanar comienza cuando nombro mi dolor delante de Dios.",
    deseoAlcanzar: "Perdonar desde el corazón y recuperar la paz interior.",
    deseoConservar: "La sensibilidad que me conecta con la compasión divina.",
    deseoEvitar: "Encerrar mis emociones hasta que se vuelvan resentimiento.",
    deseoEliminar: "Los pensamientos de victimización que detienen mi avance.",
    consejoMana: "Después de escribir, ora por la persona y entrégala por nombre al Señor.",
    resumen: "Entrega tu dolor a Dios mediante una carta de sanidad.",
    instrucciones: "Escribe la carta siguiendo los pasos sugeridos (reconocer, perdonar, soltar), léela en oración y entrégale a Dios cada nombre o situación mencionada."
  },
  {
    day: day(10),
    title: "Sea un Líder por un Día",
    verse: "Mr 10:45",
    youtubeId: "zgSFYu7M74o",
    interaction: "service-check",
    areas: { relational: 1, spiritual: .5, work: .5 },
    area: "Laboral",
    contenidoDevocional: "El liderazgo del Reino se expresa sirviendo con intención y amor. Tomar la iniciativa por un día te impulsa a detectar necesidades y responder con generosidad. Aprende del ejemplo de Jesús que lidera lavando pies y levantando a otros.",
    queAprendi: "Liderar es servir primero y dar el ejemplo con mis acciones.",
    deseoAlcanzar: "Modelar liderazgo servicial en mi entorno inmediato.",
    deseoConservar: "La disposición para escuchar antes de dirigir.",
    deseoEvitar: "Gobernar desde el ego o la queja.",
    deseoEliminar: "La pasividad que me mantiene como espectador.",
    consejoMana: "Elige a quién servir hoy y hazlo con excelencia, sin esperar reconocimiento.",
    resumen: "Sirve como líder por un día con acciones concretas.",
    instrucciones: "Marca las acciones que asumirás (ayudar, enseñar, llamar), agenda cuándo las ejecutarás y al final registra cómo se sintió servir como Jesús."
  },
  {
    day: day(11),
    title: "Un Plan de Vida para Llegar",
    verse: "Jer 29:11",
    youtubeId: "-8XMOxjgFFI",
    interaction: "goals-table",
    areas: { spiritual: .2, mental: .2, emotional: .2, physical: .2, financial: .2, work: .2, relational: .2 },
    area: "Mental",
    contenidoDevocional: "Un plan de vida convierte los sueños en pasos concretos guiados por Dios. Evalúa cada área, define metas, indicadores y acciones medibles. Cuando escribes lo que el Señor te mostró, preparas el camino para caminar con constancia.",
    queAprendi: "La visión se vuelve alcanzable cuando la traduzco en objetivos claros.",
    deseoAlcanzar: "Diseñar un plan integral que honre mi propósito en Cristo.",
    deseoConservar: "La claridad sobre lo que Dios me pidió priorizar.",
    deseoEvitar: "Divagar sin rumbo ni seguimiento.",
    deseoEliminar: "La improvisación que desperdicia recursos y tiempo.",
    consejoMana: "Revisa tu plan cada semana y celebra los pequeños avances.",
    resumen: "Escribe un plan de vida integral con metas claras por área.",
    instrucciones: "Evalúa cada área con honestidad, define una meta específica, asigna un indicador y una acción inicial. Agenda la fecha de revisión para sostener el plan."
  },
  {
    day: day(12),
    title: "Nadie Sabe lo que Tiene hasta que no lo Escribe",
    verse: "Hab 2:2",
    youtubeId: "gkhNEQWU1qs",
    interaction: "mini-budget",
    areas: { financial: 2 },
    area: "Financiero",
    contenidoDevocional: "Escribir tu inventario financiero revela cómo Dios ya ha provisto. Registrar ingresos, gastos y compromisos te ayuda a decidir con sabiduría y agradecimiento. La administración intencional abre espacio para nuevas oportunidades.",
    queAprendi: "Cuando conozco mis números puedo honrar mejor a Dios con ellos.",
    deseoAlcanzar: "Llevar un registro actualizado de todo lo que recibo y gasto.",
    deseoConservar: "La gratitud por cada recurso que llega a mis manos.",
    deseoEvitar: "Gastos impulsivos que desordenan mis cuentas.",
    deseoEliminar: "La creencia de que no tengo suficiente para administrar.",
    consejoMana: "Aparta los primeros minutos del día para revisar tus finanzas y orar por ellas.",
    resumen: "Escribe tus ingresos y gastos para ver lo que Dios ya te dio.",
    instrucciones: "Registra los ingresos del mes, lista los gastos principales y analiza la diferencia para decidir qué ajustes harás con gratitud."
  },
  {
    day: day(13),
    title: "Gaste con Inteligencia",
    verse: "Pr 21:5",
    youtubeId: "SqhQy0pQDYA",
    interaction: "cut+reinvest",
    areas: { financial: 1 },
    area: "Financiero",
    contenidoDevocional: "La buena administración incluye decidir qué cortar para invertir en lo eterno. Analiza tus gastos, identifica fugas y reasigna esos recursos a metas que impulsen tu propósito. La mayordomía te permite sembrar con libertad.",
    queAprendi: "Cada gasto responde a un valor, y puedo redefinir mis prioridades.",
    deseoAlcanzar: "Reducir un gasto innecesario y redirigirlo a un objetivo de Reino.",
    deseoConservar: "La valentía para hacer ajustes aunque sean incómodos.",
    deseoEvitar: "Volver a los hábitos de consumo que me esclavizan.",
    deseoEliminar: "La culpa que me impide tomar decisiones financieras firmes.",
    consejoMana: "Aplica la regla de esperar 24 horas antes de comprar algo no planificado.",
    resumen: "Recorta un gasto y reinvierte ese dinero con propósito.",
    instrucciones: "Identifica un gasto que eliminarás, define en qué investirás esa cantidad (deuda, ahorro o generosidad) y pon en práctica el cambio desde hoy."
  },
  {
    day: day(14),
    title: "Cómo Invertir en el Reino de Dios",
    verse: "2 Co 9:6-7",
    youtubeId: "qSD1kEaWlHs",
    interaction: "petitions+verse",
    areas: { financial: 1, spiritual: .5 },
    area: "Espiritual",
    contenidoDevocional: "Invertir en el Reino es sembrar en personas, proyectos y necesidades que reflejan el corazón de Dios. Ora por dónde canalizar tus recursos y hazlo con gozo sabiendo que produces fruto eterno. Cada semilla trae multiplicación para otros y para ti.",
    queAprendi: "Dar es una respuesta de adoración que amplía el Reino.",
    deseoAlcanzar: "Establecer un plan de generosidad constante.",
    deseoConservar: "La sensibilidad para escuchar dónde Dios quiere que siembre.",
    deseoEvitar: "Dar por obligación o solo cuando sobra.",
    deseoEliminar: "El miedo a quedar sin recursos si obedezco.",
    consejoMana: "Define un porcentaje para el Reino y entrégalo primero con alegría.",
    resumen: "Planifica tu generosidad y ora por tus peticiones.",
    instrucciones: "Escribe tres peticiones específicas y el versículo que las respalda; ora por ellas a diario y decide cuánto y cuándo sembrarás."
  },
  {
    day: day(15),
    title: "Active su Red de Amigos",
    verse: "Ec 4:9-10",
    youtubeId: "BdXKs6lZD4Y",
    interaction: "friends+action",
    areas: { relational: 2 },
    area: "Relacional",
    contenidoDevocional: "Dios usa nuestra red de amigos para sostenernos, confrontarnos y animarnos. Activarla implica identificar quién necesita atención y qué puedo aportar hoy. Al cuidar estas conexiones también recibimos fuerza para seguir.",
    queAprendi: "Soy responsable de cultivar amistades que reflejen el amor de Cristo.",
    deseoAlcanzar: "Reconectar con un amigo clave y ofrecerle apoyo concreto.",
    deseoConservar: "La confianza que hemos construido con honestidad y lealtad.",
    deseoEvitar: "Dejar que el orgullo me aísle cuando necesito ayuda.",
    deseoEliminar: "La indiferencia ante las luchas de quienes amo.",
    consejoMana: "Haz esa llamada o envío de mensaje antes de que termine el día.",
    resumen: "Reactiva relaciones que Dios usa para sostenerte.",
    instrucciones: "Anota hasta tres personas clave, registra su contacto y define la acción concreta con la que las bendecirás en las próximas 24 horas."
  },
  {
    day: day(16),
    title: "Haga Esto y Mejore sus Relaciones",
    verse: "Col 3:12-14",
    youtubeId: "2thwYkQKBhk",
    interaction: "relation-skill",
    areas: { relational: 1, emotional: .5 },
    area: "Relacional",
    contenidoDevocional: "Las relaciones se fortalecen cuando practicamos habilidades intencionales como escuchar, afirmar y perdonar. Elegir una acción concreta hoy abrirá puertas de reconciliación y crecimiento. Recuerda que amar se aprende ejercitándolo.",
    queAprendi: "Cada gesto de amor intencional suma construcción a mis vínculos.",
    deseoAlcanzar: "Aplicar una habilidad relacional que transforme el ambiente.",
    deseoConservar: "La humildad para pedir perdón cuando fallo.",
    deseoEvitar: "Responder desde el impulso y herir con mis palabras.",
    deseoEliminar: "Los patrones tóxicos que repito sin darme cuenta.",
    consejoMana: "Practica la escucha activa: haz preguntas y valida lo que escuchas.",
    resumen: "Aplica intencionalmente una habilidad relacional.",
    instrucciones: "Elige la habilidad que practicarás hoy (palabras, escucha, actitud o asertividad), escribe cómo la aplicarás y llévala a cabo en tu próximo encuentro."
  },
  {
    day: day(17),
    title: "La Salud Física es un Reflejo de la Salud Espiritual",
    verse: "3 Jn 2",
    youtubeId: "4wb9CgwMJ2Y",
    interaction: "health-daily",
    areas: { physical: 2, emotional: .5 },
    area: "Físico",
    contenidoDevocional: "La salud física refleja la disciplina espiritual porque ambos ámbitos están conectados. Establece acciones diarias de alimentación, descanso y movimiento que honren al Creador. Cada pequeña decisión suma a una vida llena de propósito.",
    queAprendi: "Cuidar mi cuerpo es una expresión de obediencia y gratitud.",
    deseoAlcanzar: "Crear una rutina saludable que pueda sostener en el tiempo.",
    deseoConservar: "La motivación espiritual que me impulsa a perseverar.",
    deseoEvitar: "Saltarme los compromisos cuando la emoción baja.",
    deseoEliminar: "La negligencia que deteriora mi bienestar.",
    consejoMana: "Celebra cada avance y registra cómo Dios fortalece tu disciplina.",
    resumen: "Construye una rutina saludable que honre a Dios con tu cuerpo.",
    instrucciones: "Registra tus horas de sueño, minutos de ejercicio y estado emocional; con esos datos decide qué pequeño ajuste harás mañana."
  },
  {
    day: day(18),
    title: "La Comida en la Biblia y sus Discusiones",
    verse: "1 Co 10:31",
    youtubeId: "EwZqqQ4nMfU",
    interaction: "menu+gratitude",
    areas: { physical: 1, spiritual: .5 },
    area: "Físico",
    contenidoDevocional: "La mesa es un espacio de comunión y propósito en la Biblia. Planear tu menú y agradecer transforma la comida en un acto de adoración. Permite que cada plato recuerde la provisión y la bondad del Señor.",
    queAprendi: "Comer con conciencia me conecta con la provisión diaria de Dios.",
    deseoAlcanzar: "Organizar comidas equilibradas que bendigan a mi familia.",
    deseoConservar: "La gratitud antes de cada alimento.",
    deseoEvitar: "Excesos que dañan mi salud y mi testimonio.",
    deseoEliminar: "El desorden que vuelve caótica la hora de comer.",
    consejoMana: "Ora mientras cocinas y comparte un verso en la mesa.",
    resumen: "Planifica tu mesa con gratitud y conciencia.",
    instrucciones: "Organiza el menú del día, redacta una oración o versículo de gratitud y compártelo con quienes se sienten a la mesa contigo."
  },
  {
    day: day(19),
    title: "Descansa, Dice Dios",
    verse: "Mt 11:28-29",
    youtubeId: "rRB4beBCX0E",
    interaction: "rest-choice",
    areas: { emotional: 1, spiritual: .5, relational: .5 },
    area: "Emocional",
    contenidoDevocional: "Dios ordenó el descanso para restaurar cuerpo, alma y espíritu. Hacer una pausa deliberada es un acto de confianza en su provisión. Cuando obedeces, Él renueva tus fuerzas y te recuerda que no todo depende de ti.",
    queAprendi: "Descansar es obedecer y reconocer la soberanía de Dios.",
    deseoAlcanzar: "Apartar un día o un bloque real de descanso reparador.",
    deseoConservar: "La paz que experimento al soltar el control.",
    deseoEvitar: "Llenar mi agenda de actividades que me agotan.",
    deseoEliminar: "La culpa que siento por detenerme.",
    consejoMana: "Agenda tu descanso como una cita sagrada y protégela de las interrupciones.",
    resumen: "Recibe el descanso como mandato de Dios.",
    instrucciones: "Selecciona la práctica de descanso que harás, agenda el momento específico y protege ese espacio como un encuentro con el Señor."
  },
  {
    day: day(20),
    title: "Convirtiendo los Retos en Proyectos de Vida",
    verse: "Pr 16:3",
    youtubeId: "3WQTyyFDt60",
    interaction: "matrix-table",
    areas: { spiritual: .2, mental: .2, emotional: .2, physical: .2, financial: .2, work: .2, relational: .2 },
    area: "Mental",
    contenidoDevocional: "Los retos vividos en estas semanas se convierten ahora en proyectos de vida. Revisa tus aprendizajes, define objetivos y asigna responsables y fechas. Planificar con Dios te prepara para transicionar de la inspiración a la acción sostenida.",
    queAprendi: "Cada reto revela una oportunidad de crecimiento permanente.",
    deseoAlcanzar: "Transformar un reto en un proyecto con pasos claros.",
    deseoConservar: "La visión integral que Dios me entregó en el proceso.",
    deseoEvitar: "Guardar mis notas sin convertirlas en acciones.",
    deseoEliminar: "La postergación que apaga los sueños.",
    consejoMana: "Divide ese proyecto en microacciones y ejecuta la primera hoy mismo.",
    resumen: "Transforma los retos en un plan de vida medible.",
    instrucciones: "Llena la tabla con objetivo, meta, indicador, fecha y primer paso para cada área y agenda inmediatamente el micro paso que te acercará a una de ellas."
  },
  {
    day: day(21),
    title: "Hoy Tengo que Decidir a Quién Tengo que Servir",
    verse: "Jos 24:15",
    youtubeId: "ro2DYZZZ5PU",
    interaction: "signature+certificate",
    areas: { spiritual: 3 },
    area: "Espiritual",
    contenidoDevocional: "Después de 21 días, Dios te invita a decidir a quién servirás con todo tu corazón. Renovar el pacto con Cristo implica entregarle tus planes, tu casa y tus talentos. Hoy firma con fe sabiendo que Él completará su obra en ti.",
    queAprendi: "Servir a Jesús es la decisión que orienta cada aspecto de mi vida.",
    deseoAlcanzar: "Ratificar mi compromiso de seguir a Cristo todos los días.",
    deseoConservar: "La pasión que se encendió durante estos retos.",
    deseoEvitar: "Volver a una fe tibia y sin fruto.",
    deseoEliminar: "Los ídolos que compiten con la voluntad de Dios.",
    consejoMana: "Escribe una declaración de servicio y léela cada mañana de esta semana.",
    resumen: "Renueva tu pacto de servir a Cristo con todo tu corazón.",
    instrucciones: "Lee la declaración final, marca tu firma de compromiso y comparte con alguien de confianza lo que decidiste para permanecer acompañado."
  },
];

// Persistencia ligera en localStorage (demo)
const LSK = {
  state: "app21_state",
};

function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    }
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function ClientOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}

// =====================
// Componente principal
// =====================
export default function App21Retos() {
  const { data: session, status: authStatus } = useSession();
  const userEmail = session?.user?.email ?? null;
  const [licenseStatus, setLicenseStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const [tab, setTab] = useState<TabKey>("home");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [openBibleReference, setOpenBibleReference] = useState<string | null>(null);

  const [initialAssess, setInitialAssess] = useLocalState<AssessMap>(`${LSK.state}:initialAssess`, createBaselineAssess());
  const [finalAssess, setFinalAssess] = useLocalState<AssessMap>(`${LSK.state}:finalAssess`, createBaselineAssess());

  const [entries, setEntries] = useLocalState<EntriesMap>(`${LSK.state}:entries`, {} as EntriesMap);
  const [completedDays, setCompletedDays] = useLocalState<number[]>(`${LSK.state}:completedDays`, []);
  const [planStartDate, setPlanStartDate] = useLocalState<string | null>(`${LSK.state}:planStartDate`, null);
  const [personalTasks, setPersonalTasks] = useLocalState<PersonalTask[]>(`${LSK.state}:personalTasks`, []);
  const [budgetState, setBudgetState] = useLocalState<BudgetState>(`${LSK.state}:budget`, emptyBudgetState());
  const [diary, setDiary] = useLocalState<DiaryEntry[]>(`${LSK.state}:diary`, []);
  const [goals, setGoals] = useLocalState<Goal[]>(`${LSK.state}:goals`, []);
  const [goalLogs, setGoalLogs] = useLocalState<GoalLog[]>(`${LSK.state}:goalLogs`, []);
  const [signature, setSignature] = useLocalState<string | null>(`${LSK.state}:signature`, null);
  const [actionDates, setActionDates] = useLocalState<string[]>(`${LSK.state}:actionDates`, []);
  const [initialAssessSaved, setInitialAssessSaved] = useLocalState<boolean>(`${LSK.state}:initialAssessSaved`, false);
  const [finalAssessSaved, setFinalAssessSaved] = useLocalState<boolean>(`${LSK.state}:finalAssessSaved`, false);
  const [isEditingInitial, setIsEditingInitial] = useState<boolean>(() => !initialAssessSaved);
  const [isEditingFinal, setIsEditingFinal] = useState<boolean>(() => !finalAssessSaved);
  const [isRemoteHydrated, setIsRemoteHydrated] = useState(false);
  const hasAppliedRemoteRef = useRef(false);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated" || !session?.user?.email) {
      setLicenseStatus("denied");
      return;
    }

    let cancelled = false;
    setLicenseStatus("checking");

    (async () => {
      try {
        const response = await fetch("/api/licenses", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`license:${response.status}`);
        }
        const payload = (await response.json()) as {
          hasRetos?: boolean;
          products?: string[];
          entitlements?: Array<{ product?: string | null }>;
        };
        if (cancelled) return;
        const products =
          payload?.products ??
          payload?.entitlements
            ?.map((entry) => entry.product)
            .filter((product): product is string => Boolean(product)) ??
            [];
        const hasRetosAccess =
          payload?.hasRetos ??
          products.some((product) => product === "retos" || product === "combo");
        setLicenseStatus(hasRetosAccess ? "allowed" : "denied");
      } catch {
        if (!cancelled) {
          setLicenseStatus("denied");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.email, authStatus]);

  useEffect(() => {
    if (initialAssessSaved) {
      setIsEditingInitial(false);
    }
  }, [initialAssessSaved]);

  useEffect(() => {
    if (finalAssessSaved) {
      setIsEditingFinal(false);
    }
  }, [finalAssessSaved]);

  const isAuthenticating = authStatus === "loading";
  const isCheckingLicense = isAuthenticating || licenseStatus === "checking";
  const canAccessRetos = licenseStatus === "allowed";
  const isLoggedIn = Boolean(session?.user);
  const donationUrl = "/pago";

  const headerPrimaryCta = canAccessRetos
    ? {
        label: "Ir al reto de hoy",
        onClick: () => setTab("today"),
        icon: <Play className="mr-1 h-4 w-4" />,
      }
    : isLoggedIn
    ? {
        label: "Donar 21 Retos + Agenda",
        onClick: () => {
          window.location.href = donationUrl;
        },
        icon: <HeartHandshake className="mr-1 h-4 w-4" />,
      }
    : {
        label: "Crear cuenta / Iniciar sesión",
        onClick: () => {
          window.location.href = "/auth/signin?mode=register";
        },
        icon: <LogIn className="mr-1 h-4 w-4" />,
      };

  // Progreso global y por área
  const progressPct = useMemo(() => Math.round((completedDays.length / 21) * 100), [completedDays.length]);

const areaScores = useMemo(() => {
  const sums = createBaselineAssess(0);
  completedDays.forEach(dayNumber => {
    const challenge = CHALLENGES.find(entry => entry.day === dayNumber);
    if (!challenge) return;
    Object.entries(challenge.areas).forEach(([rawKey, weight]) => {
      const key = rawKey as AreaKey;
      const increment = (weight ?? 0) * (AREA_PROGRESS_STEPS[key] ?? 0);
      sums[key] = Math.min(10, sums[key] + increment);
    });
  });
  const scores = createBaselineAssess(0);
  AREAS.forEach(area => {
    scores[area.key] = Math.round(Math.min(10, sums[area.key]));
  });
  return scores;
}, [completedDays]);

  useEffect(() => {
    if (!planStartDate) {
      setPlanStartDate(isoDateString(new Date()));
    }
  }, [planStartDate, setPlanStartDate]);

  useEffect(() => {
    if (!userEmail || licenseStatus !== "allowed") {
      hasAppliedRemoteRef.current = false;
      setIsRemoteHydrated(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo cargar el estado");
        const remote = (await response.json()) as Partial<UserState>;
        if (cancelled) return;
        const ensureAssess = (source?: Record<string, number>): AssessMap => ({
          ...createBaselineAssess(),
          ...(source ?? {}),
        });
        setInitialAssess(ensureAssess(remote.initialAssess));
        setFinalAssess(ensureAssess(remote.finalAssess));
        setEntries(normalizeEntries(remote.entries));
        setCompletedDays(remote.completedDays ?? []);
        setDiary(remote.diary ?? []);
        setGoals(normalizeGoals(remote.goals));
        setGoalLogs(remote.goalLogs ?? []);
        setSignature(remote.signature ?? null);
        setActionDates(remote.actionDates ?? []);
        const normalizedPlanStart = normalizePlanStartString(remote.planStartDate);
        if (normalizedPlanStart) {
          setPlanStartDate(normalizedPlanStart);
        }
        setPersonalTasks(normalizePersonalTasks(remote.personalTasks));
        setBudgetState(normalizeBudgetState(remote.budget));
        hasAppliedRemoteRef.current = true;
        setIsRemoteHydrated(true);
      } catch (error) {
        console.warn("No fue posible cargar el estado remoto", error);
        if (!cancelled) {
          hasAppliedRemoteRef.current = true;
          setIsRemoteHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    userEmail,
    licenseStatus,
    setInitialAssess,
    setFinalAssess,
    setEntries,
    setCompletedDays,
    setDiary,
    setGoals,
    setGoalLogs,
    setSignature,
    setActionDates,
    setPlanStartDate,
    setPersonalTasks,
    setBudgetState,
  ]);

  useEffect(() => {
    if (!userEmail || licenseStatus !== "allowed" || !isRemoteHydrated || !hasAppliedRemoteRef.current) return;
    const payload: UserState = {
      initialAssess,
      finalAssess,
      entries,
      completedDays,
      planStartDate,
      personalTasks,
      budget: budgetState,
      diary,
      goals: goals.map(goal => ({ ...goal })) as Array<Record<string, unknown>>,
      goalLogs,
      signature,
      actionDates,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch(error => console.warn("No fue posible guardar el estado remoto", error));
    }, 800);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [userEmail, licenseStatus, isRemoteHydrated, initialAssess, finalAssess, entries, completedDays, planStartDate, personalTasks, budgetState, diary, goals, goalLogs, signature, actionDates]);

  // Streak (racha) básica: días consecutivos con acción, terminando hoy si aplica
  useEffect(() => {
    if (!completedDays.length) return;
    const today = new Date().toISOString().slice(0, 10);
    setActionDates(prev => (prev.includes(today) ? prev : [...prev, today]));
  }, [completedDays.length, setActionDates]);

  const streak = useMemo(() => {
    const dates = [...actionDates].sort();
    if (!dates.length) return 0;
    let count = 0;
    const cursor = new Date();
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (dates.includes(key)) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return count;
  }, [actionDates]);

  function markCompleted(dayNumber: number, payload: ChallengePayload = {}, note?: string) {
    const trimmedNote = note?.trim();
    setEntries(prev => ({ ...prev, [dayNumber]: { payload, note: trimmedNote, date: new Date().toISOString() } }));
    setCompletedDays(prev => (prev.includes(dayNumber) ? prev : [...prev, dayNumber]));
    if (trimmedNote) {
      setDiary(prev => [{ date: new Date().toLocaleString(), text: trimmedNote }, ...prev]);
    }
    if (!planStartDate) {
      setPlanStartDate(isoDateString(new Date()));
    }
  }

  const scrollToSection = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function openDayFromCalendar(dayNumber: number) {
    const nextAvailable = Math.min(completedDays.length + 1, CHALLENGES.length);
    const isCompleted = completedDays.includes(dayNumber);
    const isUnlocked = isCompleted || dayNumber <= nextAvailable;
    if (!isUnlocked) {
      window.alert("Aún no llegas a este día. Sigue el orden para aprovechar el proceso.");
      return;
    }
    setSelectedDay(dayNumber);
    setTab("today");
  }

  function restartPlan() {
    const confirmation = window.confirm("Esto reiniciará el progreso de los 21 retos y establecerá hoy como fecha de inicio. ¿Deseas continuar?");
    if (!confirmation) return;
    const today = isoDateString(new Date());
    setPlanStartDate(today);
    setCompletedDays([]);
    setEntries({} as EntriesMap);
    setActionDates([]);
    setSelectedDay(1);
    setTab("today");
  }

  // =====================
  // UI
  // =====================
  if (isCheckingLicense) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-mana-gradient text-white">
        <div className="space-y-3 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-white/70">Validando acceso</span>
          <h1 className="text-2xl font-semibold">Preparando tu experiencia 21 Retos…</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mana-surface text-mana-ink">
      <header className="sticky top-0 z-30 border-b border-mana-primary/10 bg-mana-surface/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4 px-4 py-4">
          <span className="mana-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-mana">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="flex min-w-[200px] flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-mana-secondary">Devocional Maná</span>
            <h1 className="font-display text-xl font-semibold text-mana-primary md:text-2xl">Marketing para la Vida</h1>
            <p className="text-xs text-mana-muted">21 retos en 7 áreas críticas de tu vida</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-full bg-white/75 px-4 py-2 text-sm shadow-sm">
              <Badge className="border-none bg-mana-secondary/15 px-3 font-medium text-mana-secondary" variant="outline">
                <Flame className="mr-1 h-4 w-4" />Racha {streak}d
              </Badge>
              <Button
                size="sm"
                className="shadow-mana bg-mana-secondary text-white hover:bg-mana-primary"
                onClick={headerPrimaryCta.onClick}
              >
                {headerPrimaryCta.icon}
                {headerPrimaryCta.label}
              </Button>
            </div>
            <AuthMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={value => setTab(value as TabKey)}>
          <div className="mb-4 sm:hidden">
            <Select value={tab} onValueChange={value => setTab(value as TabKey)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona sección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Inicio</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="retos">Retos</SelectItem>
                <SelectItem value="plan">Plan personal</SelectItem>
                <SelectItem value="budget">Presupuesto</SelectItem>
                <SelectItem value="journal">Diario</SelectItem>
                <SelectItem value="commit">Compromiso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden w-full grid-cols-2 gap-2 rounded-2xl border border-mana-primary/10 bg-white/80 p-1 shadow-sm sm:grid sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
            <TabsTrigger aria-label="Inicio" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="home"><Home className="h-4 w-4"/><span className="hidden sm:inline">Inicio</span></TabsTrigger>
            <TabsTrigger aria-label="Hoy" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="today"><Play className="h-4 w-4"/><span className="hidden sm:inline">Hoy</span></TabsTrigger>
            <TabsTrigger aria-label="Retos" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="retos"><BookOpen className="h-4 w-4"/><span className="hidden sm:inline">Retos</span></TabsTrigger>
            <TabsTrigger aria-label="Plan personal" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="plan"><ClipboardList className="h-4 w-4"/><span className="hidden sm:inline">Plan personal</span></TabsTrigger>
            <TabsTrigger aria-label="Presupuesto" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="budget"><BarChart2 className="h-4 w-4"/><span className="hidden sm:inline">Presupuesto</span></TabsTrigger>
            <TabsTrigger aria-label="Diario" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="journal"><NotebookPen className="h-4 w-4"/><span className="hidden sm:inline">Diario</span></TabsTrigger>
            <TabsTrigger aria-label="Compromiso" className="data-[state=active]:bg-mana-primary data-[state=active]:text-white data-[state=active]:shadow-mana text-mana-ink/70" value="commit"><Signature className="h-4 w-4"/><span className="hidden sm:inline">Compromiso</span></TabsTrigger>
          </TabsList>

          {/* ================= Inicio ================= */}
          <TabsContent value="home" className="mt-6 space-y-8">
            {!canAccessRetos && (
              <Card className="border-none bg-mana-primary/10 shadow-sm">
                <CardContent className="space-y-3 p-6 text-sm text-mana-ink/80">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <h3 className="font-display text-lg text-mana-primary">Realiza tu donación para desbloquear los 21 retos</h3>
                      <p className="text-mana-muted">
                        Puedes disfrutar los videos introductorios. Cuando realices tu donación, se activarán todas las dinámicas, registros y seguimiento personalizado.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Button className="shadow-mana bg-mana-secondary text-white hover:bg-mana-primary" onClick={() => (window.location.href = donationUrl)}>
                        Donar 21 Retos + Agenda
                      </Button>
                      {!isLoggedIn && (
                        <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={() => (window.location.href = "/auth/signin?mode=register")}>
                          Crear cuenta gratuita
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <Card className="border-none bg-white/95 shadow-mana">
                  <CardContent className="space-y-6 p-6">
                    <div className="space-y-3">
                      <Badge className="w-fit border-none bg-mana-primary/10 font-medium text-mana-primary" variant="secondary">Marketing para la Vida</Badge>
                      <h2 className="font-display text-2xl font-semibold text-mana-primary md:text-3xl">21 retos en 7 áreas críticas de la vida</h2>
                      <p className="text-sm text-mana-ink/80 md:text-base">
                        Vive un viaje de 21 días enfocado en restaurar tu vida espiritual, mental, emocional, relacional, laboral, física y financiera. Cada reto combina devoción, acción y reflexión para que experimentes la transformación de Dios.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {canAccessRetos ? (
                        <>
                          <Button className="shadow-mana bg-mana-secondary text-white hover:bg-mana-primary" onClick={() => setTab("today")}>
                            <Play className="mr-1 h-4 w-4" /> Ir al reto de hoy
                          </Button>
                          <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={() => scrollToSection("home-calendar")}>
                            <CalendarDays className="mr-1 h-4 w-4" /> Ver calendario
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button className="shadow-mana bg-mana-secondary text-white hover:bg-mana-primary" onClick={() => (window.location.href = donationUrl)}>
                            <HeartHandshake className="mr-1 h-4 w-4" /> Donar 21 Retos + Agenda
                          </Button>
                          {!isLoggedIn && (
                            <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={() => (window.location.href = "/auth/signin?mode=register")}>
                              <LogIn className="mr-1 h-4 w-4" /> Crear cuenta / Iniciar sesión
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-base text-mana-primary">Tu brújula inicial</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-mana-ink/80">
                  <p>
                    ¿Cómo te encuentras en las 7 áreas clave? Completa el autodiagnóstico inferior y vuelve a medir al terminar los 21 retos.
                  </p>
                  <div className="rounded-xl border border-mana-primary/10 bg-mana-primary/5 p-3 text-xs text-mana-muted">
                    Consejo: dedica unos minutos cada semana para registrar cambios; así verás el avance que Dios está produciendo en ti.
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <span className="font-medium text-mana-primary uppercase tracking-[0.3em]">Estado actual</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-mana-primary/10 bg-white/70 p-2 text-center">
                        <span className="text-[11px] uppercase tracking-[0.3em] text-mana-muted">Retos completados</span>
                        <ClientOnly fallback={<p className="font-display text-xl text-mana-primary">--</p>}>
                          <p className="font-display text-xl text-mana-primary">{completedDays.length}/21</p>
                        </ClientOnly>
                      </div>
                      <div className="rounded-lg border border-mana-primary/10 bg-white/70 p-2 text-center">
                        <span className="text-[11px] uppercase tracking-[0.3em] text-mana-muted">Racha activa</span>
                        <ClientOnly fallback={<p className="font-display text-xl text-mana-primary">--</p>}>
                          <p className="font-display text-xl text-mana-primary">{streak} días</p>
                        </ClientOnly>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section id="home-calendar" className="space-y-3">
              <ProgressCalendar
                completedDays={completedDays}
                planStartDate={planStartDate}
                onOpenDay={openDayFromCalendar}
                variant="compact"
                selectedDay={selectedDay}
              />
              <div className="flex flex-col gap-2 text-xs text-mana-muted sm:flex-row sm:items-center sm:justify-between">
                <span>Haz seguimiento diario tocando el día correspondiente.</span>
                <Button size="sm" variant="ghost" onClick={restartPlan}>Reiniciar plan</Button>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Progreso general</CardTitle>
                  <p className="text-xs uppercase tracking-[0.3em] text-mana-muted">Avance acumulado</p>
                </CardHeader>
                <CardContent>
                  <ClientOnly
                    fallback={
                      <div className="mx-auto flex h-48 w-48 flex-col items-center justify-center">
                        <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-mana-primary/5">
                          <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white">
                            <span className="font-display text-4xl font-semibold text-mana-primary">--</span>
                            <span className="text-xs uppercase tracking-[0.3em] text-mana-muted">Avance</span>
                          </div>
                        </div>
                        <p className="mt-4 text-center text-sm text-mana-ink/70">Cargando tu progreso…</p>
                      </div>
                    }
                  >
                    <div className="mx-auto flex h-48 w-48 flex-col items-center justify-center">
                      <div
                        className="relative flex h-48 w-48 items-center justify-center rounded-full bg-mana-primary/5"
                        style={{
                          background: `conic-gradient(#0EA5A3 ${Math.min(100, Math.max(0, progressPct)) * 3.6}deg, rgba(14,165,163,0.15) 0deg)`,
                        }}
                      >
                        <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white">
                          <span className="font-display text-4xl font-semibold text-mana-primary">{progressPct}%</span>
                          <span className="text-xs uppercase tracking-[0.3em] text-mana-muted">Avance</span>
                        </div>
                      </div>
                      <p className="mt-4 text-center text-sm text-mana-ink/70">Has completado {completedDays.length} de 21 retos.</p>
                    </div>
                  </ClientOnly>
                </CardContent>
              </Card>

              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Áreas fortalecidas</CardTitle>
                  <p className="text-xs text-mana-muted">Revisa cómo vas en cada esfera de la vida.</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-mana-ink/80">
                  {AREAS.map(area => (
                    <div key={area.key} className="flex items-center justify-between rounded px-3 py-2 bg-white/70">
                      <span style={{ color: area.color }} className="font-medium">{area.name}</span>
                      <span className="font-semibold text-mana-primary">{areaScores[area.key]}/10</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Próximo paso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-mana-ink/80">
                  <div className="rounded-xl border border-mana-primary/10 bg-white/80 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-mana-muted">Siguiente reto</p>
                    <p className="font-medium text-mana-primary">Día {Math.min(completedDays.length + 1, 21)} · {CHALLENGES[Math.min(completedDays.length, 20)].title}</p>
                  </div>
                  <div className="rounded-xl border border-mana-primary/10 bg-white/80 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-mana-muted">Fecha estimada de fin</p>
                    <p className="font-medium text-mana-primary">
                      {(() => {
                        const start = parsePlanStartDate(planStartDate);
                        const end = addDaysToDate(start, 20);
                        return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(end);
                      })()}
                    </p>
                  </div>
                  <Button className="w-full bg-mana-secondary text-white hover:bg-mana-primary" onClick={() => scrollToSection("autoevaluacion")}>
                    Ajustar autodiagnóstico
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section id="autoevaluacion" className="grid gap-6 xl:grid-cols-3">
              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Autodiagnóstico inicial</CardTitle>
                  <p className="text-xs text-mana-muted">Evalúa cómo te sientes hoy en cada área (0 = débil, 10 = fuerte). Guarda los valores para fijar tu punto de partida.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    {AREAS.map(area => (
                      <div key={area.key} className="grid grid-cols-4 items-center gap-3">
                        <Label className="col-span-1 text-sm font-medium text-mana-ink/80">{area.name}</Label>
                        <div className="col-span-2 flex items-center gap-3">
                          <Slider
                            value={[initialAssess[area.key]]}
                            min={0}
                            max={10}
                            step={1}
                            disabled={!isEditingInitial}
                            onValueChange={value => setInitialAssess(prev => ({ ...prev, [area.key]: value[0] }))}
                          />
                        </div>
                        <div className="col-span-1 text-right text-lg font-semibold text-mana-primary">{initialAssess[area.key]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-mana-muted">{initialAssessSaved ? "Valores guardados. Puedes editarlos cuando lo necesites." : "Aún no guardado."}</span>
                    <Button
                      variant={isEditingInitial ? "default" : "secondary"}
                      className="sm:w-auto"
                      onClick={() => {
                        if (isEditingInitial) {
                          setInitialAssessSaved(true);
                          setIsEditingInitial(false);
                        } else {
                          setInitialAssessSaved(false);
                          setIsEditingInitial(true);
                        }
                      }}
                    >
                      {isEditingInitial ? "Guardar autodiagnóstico" : "Editar valores"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Autodiagnóstico actual</CardTitle>
                  <p className="text-xs text-mana-muted">Actualiza tu avance cuando notes cambios. A partir de aquí la gráfica comparará tu progreso.</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    {AREAS.map(area => (
                      <div key={area.key} className="grid grid-cols-4 items-center gap-3">
                        <Label className="col-span-1 text-sm font-medium text-mana-ink/80">{area.name}</Label>
                        <div className="col-span-2">
                          <Slider
                            value={[finalAssess[area.key]]}
                            min={0}
                            max={10}
                            step={1}
                            disabled={!isEditingFinal}
                            onValueChange={value => setFinalAssess(prev => ({ ...prev, [area.key]: value[0] }))}
                          />
                        </div>
                        <div className="col-span-1 text-right text-lg font-semibold text-mana-primary">{finalAssess[area.key]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-mana-muted">{finalAssessSaved ? "Valores guardados. Actualiza al completar un nuevo ciclo." : "Aún no guardado."}</span>
                    {isEditingFinal ? (
                      <Button className="sm:w-auto" onClick={() => { setFinalAssessSaved(true); setIsEditingFinal(false); }}>Guardar resultados</Button>
                    ) : (
                      <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary sm:w-auto" onClick={() => { setFinalAssessSaved(false); setIsEditingFinal(true); }}>Editar valores</Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-white/85 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-mana-primary">Comparativo Antes / Después</CardTitle>
                  <p className="text-xs text-mana-muted">Observa cómo han cambiado tus áreas al guardar los dos diagnósticos.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={AREAS.map(area => ({ subject: area.name, Antes: initialAssess[area.key], Despues: finalAssess[area.key] }))}>
                        <PolarGrid stroke="#D2D9ED" radialLines={false} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#1B2440", fontSize: 11 }} tickLine={false} />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 10]}
                          tick={{ fill: "#94A3C6", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          tickCount={6}
                        />
                        <Radar name="Antes" dataKey="Antes" stroke="#9DB2FF" fill="#9DB2FF" fillOpacity={0.25} />
                        <Radar name="Después" dataKey="Despues" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.35} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-2 text-xs text-mana-muted">
                    <span>• Azul claro: valores guardados inicialmente.</span>
                    <span>• Azul profundo: tu estado actual. ¡Actualízalo cuando avances!</span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ================= Hoy (reto del día) ================= */}
          <TabsContent value="today" className="mt-6">
            <TodayChallenge
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              onCompleted={markCompleted}
              entries={entries}
              onOpenReference={reference => setOpenBibleReference(reference)}
              canAccess={canAccessRetos}
            />
          </TabsContent>

          {/* ================= Retos (lista) ================= */}
          <TabsContent value="retos" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {CHALLENGES.map(ch => (
                <Card key={ch.day} className={`border border-mana-primary/10 bg-white/85 shadow-sm transition-shadow hover:shadow-mana ${completedDays.includes(ch.day) ? "outline outline-1 outline-green-400/40" : ""}`}>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="font-display text-base text-mana-primary">Día {ch.day}. {ch.title}</CardTitle>
                    {completedDays.includes(ch.day) && <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3"/>Hecho</Badge>}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-xs text-mana-muted">
                      <span>Áreas: {Object.keys(ch.areas).map(k => AREAS.find(a=>a.key===k)?.name).join(", ")}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" className="shadow-sm" onClick={()=>{ setSelectedDay(ch.day); setTab("today"); }}>Ver reto</Button>
                      {completedDays.includes(ch.day) && <Button size="sm" variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={()=>{ setSelectedDay(ch.day); setTab("today"); }}>Ver registro</Button>}
                      {!canAccessRetos && (
                        <Button size="sm" variant="ghost" className="text-mana-primary" onClick={() => (window.location.href = "/pago")}>Donar para desbloquear</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ================= Plan personal ================= */}
          <TabsContent value="plan" className="mt-6 space-y-8">
            <PersonalPlanSection tasks={personalTasks} setTasks={setPersonalTasks} />
            <GoalsSection goals={goals} setGoals={setGoals} goalLogs={goalLogs} setGoalLogs={setGoalLogs} />
          </TabsContent>

          {/* ================= Presupuesto ================= */}
          <TabsContent value="budget" className="mt-6">
            <BudgetPlanner
              budgetState={budgetState}
              setBudgetState={setBudgetState}
              onOpenReference={reference => setOpenBibleReference(reference)}
            />
          </TabsContent>

          {/* ================= Diario ================= */}
          <TabsContent value="journal" className="mt-6">
            <JournalSection diary={diary} setDiary={setDiary} />
          </TabsContent>

          {/* ================= Compromiso final ================= */}
          <TabsContent value="commit" className="mt-6">
            <CommitmentSection signature={signature} setSignature={setSignature} setTab={setTab} setFinalAssess={setFinalAssess} areaScores={areaScores} />
          </TabsContent>
        </Tabs>
        <BibleModal reference={openBibleReference} onClose={() => setOpenBibleReference(null)} />
      </main>

      <footer className="py-8 text-center text-xs text-mana-muted">Ministerio Maná · Restauramos vidas con propósito · Versión prototipo</footer>
    </div>
  );
}

// =====================
// Subcomponentes
// =====================
function BibleModal({ reference, onClose }: { reference: string | null; onClose: () => void }) {
  const [query, setQuery] = useState(reference ?? "");
  const [books, setBooks] = useState<BibleBookSummary[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterVerses, setChapterVerses] = useState<string[]>([]);
  const [currentBookLabel, setCurrentBookLabel] = useState<string>("");
  const [currentBookChapters, setCurrentBookChapters] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerTitle, setHeaderTitle] = useState(reference ?? "");
  const [highlightContext, setHighlightContext] = useState<HighlightContext | null>(null);

  const booksRef = useRef<BibleBookSummary[]>([]);
  const mountedRef = useRef(true);
  const versesContainerRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const autoScrollKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const ensureMetadata = useCallback(async (): Promise<BibleBookSummary[]> => {
    if (booksRef.current.length === 0) {
      const metadata = await getBibleBooksMetadata();
      booksRef.current = metadata;
      if (mountedRef.current) {
        setBooks(metadata);
      }
    }
    return booksRef.current;
  }, []);

  useEffect(() => {
    void ensureMetadata();
  }, [ensureMetadata]);

  const loadChapter = useCallback(async (bookAbbrev: string, chapter: number) => {
    const data = await getBibleChapterContent(bookAbbrev, chapter);
    if (!mountedRef.current) return null;
    verseRefs.current = {};
    autoScrollKeyRef.current = null;
    setSelectedBook(bookAbbrev);
    setSelectedChapter(chapter);
    setChapterVerses(data.verses);
    setCurrentBookLabel(data.bookLabel);
    setCurrentBookChapters(data.totalChapters);
    return data;
  }, []);

  const handleReference = useCallback(
    async (rawRef: string) => {
      const trimmed = rawRef.trim();
      if (!trimmed) {
        setError("Ingresa una cita bíblica para consultar.");
        setChapterVerses([]);
        setHighlightContext(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const metadata = await ensureMetadata();
        const passages = parseReference(trimmed);
        if (passages.length === 0) throw new Error("No se reconoció la cita bíblica.");
        const first = passages[0];
        const bookExists = metadata.some(book => book.abbrev === first.bookAbbrev);
        if (!bookExists) throw new Error("El libro solicitado no está disponible en la Biblia local.");
        const highlightMap = buildHighlightMap(passages, first.bookAbbrev);
        const data = await loadChapter(first.bookAbbrev, first.chapter);
        if (!mountedRef.current || !data) return;
        setHighlightContext({ bookAbbrev: first.bookAbbrev, chapters: highlightMap });
        setHeaderTitle(trimmed);
        setQuery(trimmed);
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : "No fue posible obtener el pasaje.";
        setError(message);
        setChapterVerses([]);
        setHighlightContext(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [ensureMetadata, loadChapter],
  );

  const handleManualNavigation = useCallback(
    async (bookAbbrev: string, chapter: number, options?: { resetHighlight?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        await ensureMetadata();
        const data = await loadChapter(bookAbbrev, chapter);
        if (!mountedRef.current || !data) return;
        if (options?.resetHighlight || (highlightContext && highlightContext.bookAbbrev !== bookAbbrev)) {
          setHighlightContext(null);
        }
        setHeaderTitle(`${data.bookLabel} ${data.chapter}`);
        setQuery(`${data.bookLabel} ${data.chapter}`);
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : "No fue posible cargar el capítulo solicitado.";
        setError(message);
        setChapterVerses([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [ensureMetadata, loadChapter, highlightContext],
  );

  const handleInlineReference = useCallback(
    (ref: string) => {
      setQuery(ref);
      void handleReference(ref);
    },
    [handleReference],
  );

  useEffect(() => {
    if (!reference) return;
    setQuery(reference);
    setHeaderTitle(reference);
    void handleReference(reference);
  }, [reference, handleReference]);

  const highlightForChapter = useMemo(() => {
    if (!highlightContext || highlightContext.bookAbbrev !== selectedBook) return null;
    return highlightContext.chapters[selectedChapter] ?? null;
  }, [highlightContext, selectedBook, selectedChapter]);

  const chaptersAvailable = useMemo(() => {
    if (selectedBook) {
      const meta = books.find(book => book.abbrev === selectedBook);
      if (meta) return meta.chapters;
    }
    return currentBookChapters;
  }, [books, selectedBook, currentBookChapters]);

  const highlightedVerses = useMemo(() => {
    if (!highlightForChapter) return new Set<number>();
    if (highlightForChapter === "all") {
      return new Set(chapterVerses.map((_, index) => index + 1));
    }
    return new Set(highlightForChapter);
  }, [highlightForChapter, chapterVerses]);

  useEffect(() => {
    if (loading) return;
    if (!selectedBook || !highlightForChapter || chapterVerses.length === 0) return;
    if (Array.isArray(highlightForChapter) && highlightForChapter.length === 0) return;
    const container = versesContainerRef.current;
    if (!container) return;

    const targetVerseNumber = highlightForChapter === "all" ? 1 : highlightForChapter[0];
    if (!targetVerseNumber || Number.isNaN(targetVerseNumber)) return;
    const targetElement = verseRefs.current[targetVerseNumber];
    if (!targetElement) return;

    const key = `${selectedBook}-${selectedChapter}-${highlightForChapter === "all" ? "all" : highlightForChapter.join(",")}`;
    if (autoScrollKeyRef.current === key) return;
    autoScrollKeyRef.current = key;

    if (typeof targetElement.scrollIntoView === "function") {
      targetElement.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      const offsetTop = targetElement.offsetTop;
      const targetScroll = Math.max(offsetTop - 72, 0);
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [highlightForChapter, chapterVerses, loading, selectedBook, selectedChapter]);

  const hasContent = chapterVerses.length > 0;

  if (!reference) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10" onClick={onClose}>
      <div className="relative max-h-full w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-mana" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-mana-primary/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-mana-muted">Biblia RVR1960</p>
            <h3 className="font-display text-lg text-mana-primary">{headerTitle || `${currentBookLabel} ${selectedChapter}`}</h3>
          </div>
          <button className="rounded-full bg-mana-primary/10 p-2 text-mana-primary transition hover:bg-mana-primary/20" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={event => {
              event.preventDefault();
              void handleReference(query);
            }}
          >
            <Input
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej: Juan 15:5"
            />
            <Button type="submit" className="sm:w-36">
              <Search className="mr-2 h-4 w-4" />Buscar
            </Button>
          </form>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Select
                value={selectedBook ?? undefined}
                onValueChange={value => {
                  void handleManualNavigation(value, 1, { resetHighlight: true });
                }}
                disabled={loading || books.length === 0}
              >
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Selecciona un libro" />
                </SelectTrigger>
                <SelectContent>
                  {books.map(book => (
                    <SelectItem key={book.abbrev} value={book.abbrev}>
                      {book.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedBook ? String(selectedChapter) : undefined}
                onValueChange={value => {
                  if (!selectedBook) return;
                  const chapter = Number.parseInt(value, 10);
                  if (Number.isNaN(chapter)) return;
                  void handleManualNavigation(selectedBook, chapter);
                }}
                disabled={loading || !selectedBook}
              >
                <SelectTrigger className="sm:w-32">
                  <SelectValue placeholder="Capítulo" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: chaptersAvailable || 0 }, (_, index) => index + 1).map(chapter => (
                    <SelectItem key={chapter} value={String(chapter)}>
                      Capítulo {chapter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={!selectedBook || selectedChapter <= 1 || loading}
                onClick={() => {
                  if (!selectedBook || selectedChapter <= 1) return;
                  void handleManualNavigation(selectedBook, selectedChapter - 1);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                disabled={!selectedBook || !chaptersAvailable || selectedChapter >= chaptersAvailable || loading}
                onClick={() => {
                  if (!selectedBook || !chaptersAvailable || selectedChapter >= chaptersAvailable) return;
                  void handleManualNavigation(selectedBook, selectedChapter + 1);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div ref={versesContainerRef} className="h-80 overflow-y-auto rounded-2xl border border-mana-primary/10 bg-white/80 p-4 text-sm text-mana-ink/80">
            {loading && <p className="text-mana-muted">Buscando el pasaje…</p>}
            {!loading && error && <p className="text-rose-600">{error}</p>}
            {!loading && !error && hasContent && (
              <div className="space-y-2">
                {chapterVerses.map((verse, index) => {
                  const verseNumber = index + 1;
                  const isHighlighted = highlightedVerses.has(verseNumber);
                  return (
                    <p
                      key={verseNumber}
                      ref={element => {
                        verseRefs.current[verseNumber] = element;
                      }}
                      className={cn(
                        "rounded-xl px-3 py-2 leading-relaxed transition",
                        isHighlighted ? "bg-mana-primary/20 text-mana-primaryDark ring-2 ring-mana-primary/40 shadow-sm" : "hover:bg-mana-primary/5",
                      )}
                    >
                      <span className="mr-2 font-semibold text-mana-primary">{verseNumber}</span>
                      <span>{verse}</span>
                    </p>
                  );
                })}
              </div>
            )}
            {!loading && !error && !hasContent && <p className="text-mana-muted">Selecciona un pasaje para visualizarlo en la Reina Valera 1960.</p>}
          </div>
          <p className="text-xs text-mana-muted">
            Tip:{" "}
            <span>
              {renderWithScriptureLinks(
                "puedes escribir citas (p. ej. “Salmo 23” o “Filipenses 4:4-7”) o navegar por libro y capítulo con los selectores.",
                handleInlineReference,
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LockedFeature({ canAccess, children, message }: { canAccess: boolean; children: React.ReactNode; message?: string }) {
  if (canAccess) return <>{children}</>;
  return (
    <div className="relative">
      <div className="pointer-events-none blur-[1px] opacity-60">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-mana-primary/85 p-6 text-center text-white">
        <Lock className="h-6 w-6" />
        <p className="text-sm leading-relaxed">
          {message ?? "Para completar el reto necesitas activar tu donación a 21 Retos."}
        </p>
        <Button
          variant="secondary"
          className="bg-white text-mana-primary hover:bg-white/90"
          onClick={() => {
            window.location.href = "/pago";
          }}
        >
          Donar 21 Retos + Agenda
        </Button>
      </div>
    </div>
  );
}

function TodayChallenge({ selectedDay, setSelectedDay, onCompleted, entries, onOpenReference, canAccess }: TodayChallengeProps) {
  const ch = CHALLENGES.find(c => c.day === selectedDay) || CHALLENGES[0];
  const [note, setNote] = useState("");
  const [payload, setPayload] = useState<ChallengePayload>(() => normalizePayload(entries[selectedDay]?.payload));

  useEffect(() => {
    setPayload(normalizePayload(entries[selectedDay]?.payload));
    setNote(entries[selectedDay]?.note ?? "");
  }, [entries, selectedDay]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="border-none bg-white/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-xl text-mana-primary">Día {ch.day}. {ch.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Video */}
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-mana-primary/10">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${ch.youtubeId || "dQw4w9WgXcQ"}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
            </div>
            <p className="text-sm text-mana-ink/70">
              Versículo base:{" "}
              {ch.verse ? (
                <button className="font-semibold text-mana-primary underline underline-offset-4 hover:text-mana-primaryDark" onClick={() => onOpenReference(ch.verse!)}>
                  {ch.verse}
                </button>
              ) : (
                <span className="font-semibold text-mana-primary">—</span>
              )}
            </p>
            <div className="challenge-area-label">Área: Vida {ch.area}</div>
            <div className="space-y-2 rounded-lg border border-mana-primary/10 bg-mana-primary/5 p-4">
              <h3 className="challenge-section-title">Contenido devocional</h3>
              <p className="challenge-section-content whitespace-pre-line">
                {renderWithScriptureLinks(ch.contenidoDevocional, onOpenReference)}
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-mana-primary/10 bg-white/85 p-5 shadow-sm">
              <h3 className="font-display text-base text-mana-primary">Resumen del reto</h3>
              <p className="text-sm font-medium text-mana-ink/80">
                {renderWithScriptureLinks(ch.resumen, onOpenReference)}
              </p>
              <p className="text-sm leading-relaxed text-mana-ink/70">
                {renderWithScriptureLinks(ch.instrucciones, onOpenReference)}
              </p>
            </div>

            <LockedFeature canAccess={canAccess}>
              <div className="space-y-5">
                <Interaction type={ch.interaction} payload={payload} setPayload={setPayload} />

                <div className="space-y-2">
                  <Label>Reflexión (opcional)</Label>
                  <Textarea placeholder="¿Qué te habló Dios hoy?" value={note} onChange={e => setNote(e.target.value)} />
                </div>

                <div className="space-y-4 rounded-2xl border border-mana-primary/10 bg-white/90 p-5 shadow-sm">
                  <div>
                    <h3 className="font-display text-base text-mana-primary">Mis transformaciones</h3>
                    <p className="text-xs text-mana-muted">Completa estos campos para aterrizar lo que Dios te mostró hoy.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label>¿Qué aprendí?</Label>
                      <Textarea
                        placeholder={ch.queAprendi}
                        value={stringValue(payload.aprendi)}
                        onChange={e => setPayload(prev => ({ ...prev, aprendi: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>¿Qué deseo alcanzar?</Label>
                      <Textarea
                        placeholder={ch.deseoAlcanzar}
                        value={stringValue(payload.deseoAlcanzarPersonal)}
                        onChange={e => setPayload(prev => ({ ...prev, deseoAlcanzarPersonal: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>¿Qué deseo conservar?</Label>
                      <Textarea
                        placeholder={ch.deseoConservar}
                        value={stringValue(payload.deseoConservarPersonal)}
                        onChange={e => setPayload(prev => ({ ...prev, deseoConservarPersonal: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>¿Qué deseo evitar?</Label>
                      <Textarea
                        placeholder={ch.deseoEvitar}
                        value={stringValue(payload.deseoEvitarPersonal)}
                        onChange={e => setPayload(prev => ({ ...prev, deseoEvitarPersonal: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>¿Qué deseo eliminar?</Label>
                    <Textarea
                      placeholder={ch.deseoEliminar}
                      value={stringValue(payload.deseoEliminarPersonal)}
                      onChange={e => setPayload(prev => ({ ...prev, deseoEliminarPersonal: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={() => onCompleted(ch.day, payload, note)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />Marcar completado
                    </Button>
                  </div>
                </div>
              </div>
            </LockedFeature>

            <div className="flex items-center gap-3 pt-2">
              <Select value={String(selectedDay)} onValueChange={v => setSelectedDay(parseInt(v))}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Ir al día" /></SelectTrigger>
                <SelectContent>
                  {CHALLENGES.map(c => (<SelectItem key={c.day} value={String(c.day)}>Día {c.day}</SelectItem>))}
                </SelectContent>
              </Select>
              {!canAccess && (
                <Button size="sm" variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={() => (window.location.href = "/pago")}>
                  Donar para desbloquear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-1 lg:sticky lg:top-24 self-start">
        <Card className="border-none bg-white/85 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base text-mana-primary">Resumen del día</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-mana-ink/80">
            <p className="challenge-area-label text-[0.6rem]">Área: Vida {ch.area}</p>
            <div>
              <span className="text-mana-muted">Resumen:</span>
              <br />
              <span>{renderWithScriptureLinks(ch.resumen, onOpenReference)}</span>
            </div>
            <div><span className="text-mana-muted">Áreas impactadas:</span><br/>{Object.keys(ch.areas).map(k => AREAS.find(a=>a.key===k)?.name).join(", ")}</div>
            <div><span className="text-mana-muted">Dinámica:</span><br/><span className="font-medium text-mana-primary">{INTERACTION_LABELS[ch.interaction]}</span></div>
            <div className="text-mana-muted">Estado: {entries[ch.day] ? <span className="font-medium text-green-600">Completado</span> : <span className="font-medium text-amber-600">Pendiente</span>}</div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/85 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base text-mana-primary">Consejo Maná</CardTitle></CardHeader>
          <CardContent className="challenge-consejo text-sm text-mana-ink/80">
            <span className="mr-1 text-mana-muted">“</span>
            <span>{renderWithScriptureLinks(ch.consejoMana, onOpenReference)}</span>
            <span className="ml-1 text-mana-muted">”</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Render de las distintas interacciones
function Interaction({ type, payload, setPayload }: InteractionProps) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState<number>(() => numberValue(payload.seconds, TIMER_PREVIEW_SECONDS));
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    setSeconds(numberValue(payload.seconds, TIMER_PREVIEW_SECONDS));
  }, [payload.seconds]);

  useEffect(() => {
    setPayload(prev => ({ ...prev, seconds }));
  }, [seconds, setPayload]);

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = audioMuted;
    }
  }, [audioMuted]);

  function startTimer() {
    if (running) return;
    setRunning(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.muted = audioMuted;
      audioRef.current.play().catch(() => {});
    }
    intervalRef.current = window.setInterval(() => {
      setSeconds(current => {
        if (current <= 1) {
          if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
          setRunning(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    setRunning(false);
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }

  function resetTimer() {
    stopTimer();
    setSeconds(TIMER_PREVIEW_SECONDS);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }

  switch (type) {
    case "timer+note":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-semibold tabular-nums">{Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</div>
            <Button size="sm" onClick={startTimer} disabled={running}><Play className="h-4 w-4 mr-1"/>Iniciar</Button>
            <Button size="sm" variant="secondary" onClick={stopTimer} disabled={!running}><Pause className="h-4 w-4 mr-1"/>Pausar</Button>
            <Button size="sm" variant="outline" onClick={resetTimer}>Reiniciar</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={audioMuted ? "outline" : "secondary"} onClick={() => setAudioMuted(prev => !prev)}>
              {audioMuted ? "Escuchar pista" : "Silenciar pista"}
            </Button>
            <span className="text-xs text-mana-muted">Pista de adoración de 15 minutos para acompañar tu tiempo.</span>
          </div>
          <audio ref={audioRef} src={WORSHIP_TRACK} preload="auto" />
          <p className="text-xs text-mana-muted">Temporizador de 15 minutos para tu cita con Dios.</p>
        </div>
      );

    case "two-fields":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Pasaje leído</Label>
            <Input value={stringValue(payload.chapter)} onChange={e => setPayload(prev => ({ ...prev, chapter: e.target.value }))} placeholder="p.ej., Juan 15" />
          </div>
          <div>
            <Label>Versículo clave</Label>
            <Input value={stringValue(payload.verse)} onChange={e => setPayload(prev => ({ ...prev, verse: e.target.value }))} placeholder="p.ej., Juan 15:5" />
          </div>
        </div>
      );

    case "date+reason":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Día de ayuno</Label>
            <Input type="date" value={stringValue(payload.date)} onChange={e => setPayload(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input value={stringValue(payload.reason)} onChange={e => setPayload(prev => ({ ...prev, reason: e.target.value }))} placeholder="Entrega/Intercesión…" />
          </div>
        </div>
      );

    case "declaration+verse":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Declaración del día</Label>
            <Input value={stringValue(payload.declaration)} onChange={e => setPayload(prev => ({ ...prev, declaration: e.target.value }))} placeholder="Hoy hablaré vida…" />
          </div>
          <div>
            <Label>Versículo respaldo</Label>
            <Input value={stringValue(payload.backVerse)} onChange={e => setPayload(prev => ({ ...prev, backVerse: e.target.value }))} placeholder="p.ej., Pr 18:21" />
          </div>
        </div>
      );

    case "place-select":
      return (
        <div className="grid sm:grid-cols-2 gap-3 items-end">
          <div>
            <Label>Lugar de conexión esta semana</Label>
            <Select value={stringValue(payload.place, "iglesia")} onValueChange={v => setPayload(prev => ({ ...prev, place: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="iglesia">Iglesia</SelectItem>
                <SelectItem value="grupo">Grupo/célula</SelectItem>
                <SelectItem value="mentor">Mentoría</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Checkbox checked={booleanValue(payload.commit)} onCheckedChange={v => setPayload(prev => ({ ...prev, commit: !!v }))} /> <span className="text-sm">Lo asumo como compromiso</span></div>
        </div>
      );

    case "negative+scripture":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Pensamiento negativo</Label>
            <Input value={stringValue(payload.negative)} onChange={e => setPayload(prev => ({ ...prev, negative: e.target.value }))} />
          </div>
          <div>
            <Label>Versículo que lo reemplaza</Label>
            <Input value={stringValue(payload.scripture)} onChange={e => setPayload(prev => ({ ...prev, scripture: e.target.value }))} />
          </div>
        </div>
      );

    case "mini-quiz":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Pensamiento pesimista cambiado hoy</Label>
            <Input value={stringValue(payload.changed)} onChange={e => setPayload(prev => ({ ...prev, changed: e.target.value }))} />
          </div>
          <div>
            <Label>Decisión tomada</Label>
            <Input value={stringValue(payload.decision)} onChange={e => setPayload(prev => ({ ...prev, decision: e.target.value }))} />
          </div>
        </div>
      );

    case "habit+reminder":
      return (
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Hábito a rendir</Label>
            <Input value={stringValue(payload.habit)} onChange={e => setPayload(prev => ({ ...prev, habit: e.target.value }))} placeholder="p.ej., redes de noche"/>
          </div>
          <div>
            <Label>Acción de cambio</Label>
            <Input value={stringValue(payload.action)} onChange={e => setPayload(prev => ({ ...prev, action: e.target.value }))} placeholder="Dejar el cel a las 9pm"/>
          </div>
          <div className="flex items-center gap-2"><Switch checked={booleanValue(payload.reminder)} onCheckedChange={v => setPayload(prev => ({ ...prev, reminder: !!v }))}/> <span className="text-sm">Recordatorio diario</span></div>
        </div>
      );

    case "healing-letter":
      return (
        <div>
          <Label>Escribe tu carta de sanidad</Label>
          <Textarea rows={6} value={stringValue(payload.content)} onChange={e => setPayload(prev => ({ ...prev, content: e.target.value }))} />
        </div>
      );

    case "service-check":
      return (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2"><Checkbox checked={booleanValue(payload.help)} onCheckedChange={v => setPayload(prev => ({ ...prev, help: !!v }))}/> <span>Ayudar</span></div>
          <div className="flex items-center gap-2"><Checkbox checked={booleanValue(payload.teach)} onCheckedChange={v => setPayload(prev => ({ ...prev, teach: !!v }))}/> <span>Enseñar</span></div>
          <div className="flex items-center gap-2"><Checkbox checked={booleanValue(payload.call)} onCheckedChange={v => setPayload(prev => ({ ...prev, call: !!v }))}/> <span>Llamar a alguien</span></div>
        </div>
      );

    case "goals-table":
      return (
        <div className="space-y-3 text-sm text-mana-ink/80">
          <p>Crea 1 meta por área (atajo simple para demo). Para gestionar completo ve a la pestaña <span className="font-semibold text-mana-primary">Metas</span>.</p>
          {AREAS.map(area => {
            const entry = matrixEntryValue(payload[area.key]);
            return (
              <div key={area.key} className="grid gap-2 rounded-lg border border-mana-primary/15 bg-white/70 p-3 md:grid-cols-4">
                <div className="font-medium text-sm md:col-span-1" style={{ color: area.color }}>{area.name}</div>
                <Input className="md:col-span-1" placeholder="Objetivo estratégico" value={stringValue(entry.obj)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), obj: e.target.value } }))} />
                <Input className="md:col-span-1" placeholder="Meta enfocada" value={stringValue(entry.goal)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), goal: e.target.value } }))} />
                <Input className="md:col-span-1" placeholder="Indicador" value={stringValue(entry.ind)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), ind: e.target.value } }))} />
              </div>
            );
          })}
        </div>
      );

    case "mini-budget": {
      const income = numberValue(payload.income);
      const expenses = numberValue(payload.expenses);
      const delta = income - expenses;
      return (
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Ingresos</Label>
            <Input type="number" value={stringValue(payload.income)} onChange={e => setPayload(prev => ({ ...prev, income: e.target.value }))}/>
          </div>
          <div>
            <Label>Gastos</Label>
            <Input type="number" value={stringValue(payload.expenses)} onChange={e => setPayload(prev => ({ ...prev, expenses: e.target.value }))}/>
          </div>
          <div className="text-sm text-mana-ink/80"><span className="text-mana-muted">Diferencia:</span> <span className={delta >= 0 ? "text-green-600" : "text-rose-600"}>{delta}</span></div>
        </div>
      );
    }

    case "cut+reinvest":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Gasto a eliminar</Label>
            <Input value={stringValue(payload.to_cut)} onChange={e => setPayload(prev => ({ ...prev, to_cut: e.target.value }))}/>
          </div>
          <div>
            <Label>En qué lo invertirás</Label>
            <Input value={stringValue(payload.reinvest)} onChange={e => setPayload(prev => ({ ...prev, reinvest: e.target.value }))}/>
          </div>
        </div>
      );

    case "petitions+verse":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Input placeholder="Petición 1" value={stringValue(payload.req1)} onChange={e => setPayload(prev => ({ ...prev, req1: e.target.value }))}/>
            <Input placeholder="Petición 2" value={stringValue(payload.req2)} onChange={e => setPayload(prev => ({ ...prev, req2: e.target.value }))}/>
            <Input placeholder="Petición 3" value={stringValue(payload.req3)} onChange={e => setPayload(prev => ({ ...prev, req3: e.target.value }))}/>
          </div>
          <div>
            <Label>Promesa bíblica</Label>
            <Input placeholder="p.ej., Filipenses 4:19" value={stringValue(payload.verse)} onChange={e => setPayload(prev => ({ ...prev, verse: e.target.value }))}/>
          </div>
        </div>
      );

    case "friends+action": {
      const friends = friendListValue(payload.friends);
      return (
        <div className="space-y-2">
          {[0, 1, 2].map(index => {
            const friend = friends[index] ?? ({} as FriendInfo);
            return (
              <div key={index} className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="Nombre" value={stringValue(friend.name)} onChange={e => setPayload(prev => ({
                  ...prev,
                  friends: upArr(friendListValue(prev.friends), index, { ...friend, name: e.target.value }),
                }))} />
                <Input placeholder="Contacto (tel/email)" value={stringValue(friend.contact)} onChange={e => setPayload(prev => ({
                  ...prev,
                  friends: upArr(friendListValue(prev.friends), index, { ...friend, contact: e.target.value }),
                }))} />
                <Input placeholder="Acción concreta" value={stringValue(friend.action)} onChange={e => setPayload(prev => ({
                  ...prev,
                  friends: upArr(friendListValue(prev.friends), index, { ...friend, action: e.target.value }),
                }))} />
              </div>
            );
          })}
        </div>
      );
    }

    case "relation-skill": {
      const currentSkill = stringValue(payload.skill);
      return (
        <div className="flex flex-wrap gap-2">
          {[["palabras", "Palabras"], ["escucha", "Escucha"], ["actitud", "Actitud"], ["asertividad", "Asertividad"]].map(([key, label]) => (
            <Button key={key} variant={currentSkill === key ? "default" : "secondary"} size="sm" onClick={() => setPayload(prev => ({ ...prev, skill: key }))}>{label}</Button>
          ))}
        </div>
      );
    }

    case "health-daily": {
      const sleepHours = numberValue(payload.sleep);
      const exerciseMinutes = numberValue(payload.exercise);
      const moodLevel = numberValue(payload.mood, 5);
      return (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Horas dormidas</Label><Input type="number" value={stringValue(payload.sleep)} onChange={e => setPayload(prev => ({ ...prev, sleep: e.target.value }))}/></div>
            <div><Label>Minutos de ejercicio</Label><Input type="number" value={stringValue(payload.exercise)} onChange={e => setPayload(prev => ({ ...prev, exercise: e.target.value }))}/></div>
            <div><Label>Estado emocional (0–10)</Label><Input type="number" min={0} max={10} value={stringValue(payload.mood)} onChange={e => setPayload(prev => ({ ...prev, mood: e.target.value }))}/></div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[{ name: "Hoy", sleep: sleepHours, exercise: exerciseMinutes, mood: moodLevel }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sleep" stroke="#1E3A8A" />
                <Line type="monotone" dataKey="exercise" stroke="#0EA5A3" />
                <Line type="monotone" dataKey="mood" stroke="#F2C35D" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    case "menu+gratitude":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Menú del día</Label><Textarea rows={3} value={stringValue(payload.menu)} onChange={e => setPayload(prev => ({ ...prev, menu: e.target.value }))}/></div>
          <div><Label>Frase de gratitud antes de comer</Label><Textarea rows={3} value={stringValue(payload.gratitude)} onChange={e => setPayload(prev => ({ ...prev, gratitude: e.target.value }))}/></div>
        </div>
      );

    case "rest-choice": {
      const selected = stringValue(payload.rest);
      return (
        <div className="flex flex-wrap gap-2">
          {["Silencio", "Lectura", "Caminar", "Tiempo en familia"].map(label => (
            <Button key={label} variant={selected === label ? "default" : "secondary"} size="sm" onClick={() => setPayload(prev => ({ ...prev, rest: label }))}>{label}</Button>
          ))}
        </div>
      );
    }

    case "matrix-table":
      return (
        <div className="space-y-3">
          {AREAS.map(area => {
            const entry = matrixEntryValue(payload[area.key]);
            return (
              <div key={area.key} className="grid items-center gap-2 rounded-lg border border-mana-primary/15 bg-white/70 p-3 md:grid-cols-5">
                <div className="text-sm font-medium" style={{ color: area.color }}>{area.name}</div>
                <Input placeholder="Meta" value={stringValue(entry.goal)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), goal: e.target.value } }))}/>
                <Input placeholder="Indicador" value={stringValue(entry.indicator)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), indicator: e.target.value } }))}/>
                <Input type="date" value={stringValue(entry.date)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), date: e.target.value } }))}/>
                <Input placeholder="Primer paso" value={stringValue(entry.first)} onChange={e => setPayload(prev => ({ ...prev, [area.key]: { ...matrixEntryValue(prev[area.key]), first: e.target.value } }))}/>
              </div>
            );
          })}
        </div>
      );

    case "signature+certificate":
      return (
        <div className="space-y-2 text-sm text-mana-ink/80">
          <p>Firma tu decisión de servir a Cristo. (Demo: casilla de confirmación)</p>
          <div className="flex items-center gap-2"><Checkbox checked={booleanValue(payload.signed)} onCheckedChange={v => setPayload(prev => ({ ...prev, signed: !!v }))}/> <span>Declaro mi compromiso con Jesús</span></div>
        </div>
      );

    default:
      return <div className="text-sm text-mana-muted">Interacción: {type}</div>;
  }
}

function upArr<T>(arr: T[] = [], idx: number, value: T): T[] {
  const copy = [...arr];
  copy[idx] = value;
  return copy;
}

// ============== METAS ==============
function GoalsSection({ goals, setGoals, goalLogs, setGoalLogs }: GoalsSectionProps) {
  const [draft, setDraft] = useState<GoalDraft>(createGoalDraft);

  function addGoal(){
    const id = cryptoRandomId();
    setGoals(prev => [...prev, { id, ...draft }]);
    setDraft(createGoalDraft());
  }
  function log(goal: Goal){
    const entry: GoalLog = { goalId: goal.id, date: new Date().toISOString().slice(0,10), completed: true };
    setGoalLogs(prev => [entry, ...prev]);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border-none bg-white/85 shadow-sm md:col-span-1">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Nueva meta</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-mana-ink/80">
          <div>
            <Label>Área</Label>
            <Select value={draft.area} onValueChange={value => setDraft(prev => ({ ...prev, area: value as AreaKey }))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {AREAS.map(a => (<SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Objetivo estratégico</Label><Input value={draft.objective} onChange={e=> setDraft(prev => ({ ...prev, objective: e.target.value }))}/></div>
          <div><Label>Meta enfocada</Label><Input value={draft.goal} onChange={e=> setDraft(prev => ({ ...prev, goal: e.target.value }))}/></div>
          <div><Label>Indicador</Label><Input value={draft.indicator} onChange={e=> setDraft(prev => ({ ...prev, indicator: e.target.value }))}/></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Frecuencia</Label>
              <Select value={draft.frequency} onValueChange={value => setDraft(prev => ({ ...prev, frequency: value as GoalFrequency }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hora</Label>
              <Input type="time" value={draft.hour} onChange={e=> setDraft(prev => ({ ...prev, hour: e.target.value }))}/>
            </div>
          </div>
          <div>
            <Label>Motivación</Label>
            <Select value={draft.motivation} onValueChange={value => setDraft(prev => ({ ...prev, motivation: value as GoalMotivation }))}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="intrinsic">Intrínseca</SelectItem>
                <SelectItem value="extrinsic">Extrínseca</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Plan de acción</Label><Textarea rows={3} value={draft.action} onChange={e=> setDraft(prev => ({ ...prev, action: e.target.value }))}/></div>
          <Button className="shadow-sm" onClick={addGoal}>Agregar meta</Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-white/85 shadow-sm md:col-span-2">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Mis metas</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-mana-ink/80">
          {goalLogs.length > 0 && <div className="text-xs uppercase tracking-[0.3em] text-mana-muted">Registros completados: {goalLogs.length}</div>}
          {goals.length === 0 && <div className="text-sm text-mana-muted">Aún no tienes metas. Crea la primera a la izquierda.</div>}
          {goals.map(g => (
            <div key={g.id} className="grid gap-2 rounded-xl border border-mana-primary/10 bg-white/70 p-3 md:grid-cols-7">
              <div className="md:col-span-1 font-semibold text-mana-primary">{AREAS.find(a=>a.key===g.area)?.name}</div>
              <div className="md:col-span-2 text-sm">{g.objective}</div>
              <div className="md:col-span-2 text-sm">{g.goal}</div>
              <div className="md:col-span-1 text-xs uppercase tracking-wide text-mana-muted">{g.frequency}</div>
              <div className="md:col-span-1 text-right"><Button size="sm" className="shadow-sm" variant="secondary" onClick={()=> log(g)}>Registrar hoy</Button></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== CALENDARIO ==============
function ProgressCalendar({ completedDays, planStartDate, onOpenDay, onRestartPlan, variant = "full", selectedDay }: ProgressCalendarProps) {
  const totalDays = CHALLENGES.length;
  const start = useMemo(() => parsePlanStartDate(planStartDate ?? null), [planStartDate]);
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const nextAvailable = Math.min(completedDays.length + 1, totalDays);
  const shortFormatter = useMemo(() => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }), []);
  const longFormatter = useMemo(() => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }), []);

  const leadingEmpty = ((start.getDay() + 6) % 7);
  const totalCells = leadingEmpty + totalDays;
  const rows = Math.ceil(totalCells / 7);
  const cells = Array.from({ length: rows * 7 }, (_, index) => {
    if (index < leadingEmpty || index >= leadingEmpty + totalDays) {
      return { key: `empty-${index}`, type: "empty" as const };
    }
    const offset = index - leadingEmpty;
    const dayNumber = offset + 1;
    const date = startOfLocalDay(addDaysToDate(start, offset));
    const isCompleted = completedDays.includes(dayNumber);
    const isUnlocked = isCompleted || dayNumber <= nextAvailable;
    const isToday = date.getTime() === today.getTime();
    let status: "completed" | "today" | "pending" | "overdue" | "locked";
    if (isCompleted) status = "completed";
    else if (isToday) status = "today";
    else if (!isUnlocked) status = "locked";
    else if (date < today) status = "overdue";
    else status = "pending";
    return {
      key: `day-${dayNumber}`,
      type: "day" as const,
      dayNumber,
      date,
      status,
      isUnlocked,
    };
  });

  const endDate = addDaysToDate(start, totalDays - 1);
  const startLabel = longFormatter.format(start);
  const endLabel = longFormatter.format(endDate);
  const nextLabel = completedDays.length >= totalDays ? "¡Completaste los 21 retos!" : `Día ${nextAvailable}`;

  const statusStyles: Record<"completed" | "today" | "pending" | "overdue" | "locked", string> = {
    completed: "bg-mana-secondary text-white border-transparent shadow-md",
    today: "border-2 border-mana-secondary bg-white text-mana-secondary shadow-sm",
    pending: "border border-mana-primary/15 bg-white text-mana-muted",
    overdue: "border border-mana-accent/60 bg-mana-accent/10 text-mana-accent",
    locked: "border border-dashed border-mana-muted/40 bg-white text-mana-muted/60",
  };

  const legendItems = [
    { label: "Completado", className: statusStyles.completed },
    { label: "Hoy", className: statusStyles.today },
    { label: "Disponible", className: statusStyles.pending },
    { label: "Atrasado", className: statusStyles.overdue },
    { label: "Bloqueado", className: statusStyles.locked },
  ];

  const weekLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

  const calendarBackground = variant === "compact" ? "bg-white/95" : "bg-white/90";
  const calendarCard = (
    <Card className={cn("border-none shadow-sm", calendarBackground)}>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg text-mana-primary">Calendario de progreso</CardTitle>
        <p className="text-xs text-mana-muted">Visualiza tus 21 días y mantén el ritmo.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-mana-muted">
          {weekLabels.map(label => (<span key={label}>{label}</span>))}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3">
          {cells.map(cell => {
            if (cell.type === "empty") {
              return <div key={cell.key} className="h-14 w-14" />;
            }
            const dateLabel = shortFormatter.format(cell.date);
            const isSelected = selectedDay === cell.dayNumber;
            return (
              <div key={cell.key} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenDay(cell.dayNumber)}
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-mana-secondary focus:ring-offset-2",
                    isSelected ? "bg-mana-primary text-white border-transparent shadow-lg" : statusStyles[cell.status],
                    !cell.isUnlocked && "cursor-not-allowed opacity-60"
                  )}
                  aria-label={`Día ${cell.dayNumber}`}
                >
                  {cell.status === "locked" ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-mana-muted">
                      <Lock className="h-3.5 w-3.5" />
                      {cell.dayNumber}
                    </span>
                  ) : (
                    cell.dayNumber
                  )}
                </button>
                <span className="text-[10px] uppercase tracking-wide text-mana-muted">{dateLabel}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  if (variant === "compact") {
    return calendarCard;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {calendarCard}

      <div className="space-y-4">
        <Card className="border-none bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base text-mana-primary">Resumen del plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-mana-ink/80">
            <div><span className="text-mana-muted">Inicio:</span> {startLabel}</div>
            <div><span className="text-mana-muted">Final estimado:</span> {endLabel}</div>
            <div><span className="text-mana-muted">Completados:</span> {completedDays.length}/{totalDays}</div>
            <div><span className="text-mana-muted">Próximo paso:</span> <span className="font-medium text-mana-primary">{nextLabel}</span></div>
            {typeof onRestartPlan === "function" && (
              <Button variant="secondary" className="w-full border border-mana-primary/20 text-mana-primary" onClick={onRestartPlan}>
                Reiniciar plan
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base text-mana-primary">Leyenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-mana-ink/80">
            {legendItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={cn("h-4 w-4 rounded-full border", item.className)}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PersonalPlanSection({ tasks, setTasks }: PersonalPlanSectionProps) {
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionDescription, setDecisionDescription] = useState("");
  const [decisionArea, setDecisionArea] = useState<AreaKey>("spiritual");

  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitDescription, setHabitDescription] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<TaskFrequency>("daily");
  const [habitDayOfWeek, setHabitDayOfWeek] = useState<number>(1);
  const [habitDayOfMonth, setHabitDayOfMonth] = useState<number>(1);
  const [habitArea, setHabitArea] = useState<AreaKey>("spiritual");

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetDescription, setBudgetDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetDayOfMonth, setBudgetDayOfMonth] = useState<number>(1);
  const [budgetArea, setBudgetArea] = useState<AreaKey>("financial");

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalArea, setGoalArea] = useState<AreaKey>("spiritual");

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const todayIso = isoDateString(today);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }), []);

  const areaLabel = (key?: string | null) => {
    if (!key) return "General";
    const match = AREAS.find(area => area.key === key);
    return match ? match.name : key;
  };

  const formatISODate = (value?: string | null) => {
    const parsed = parseISODate(value);
    return parsed ? dateFormatter.format(parsed) : "—";
  };

  const decisions = useMemo(() => tasks.filter(task => task.category === "decision"), [tasks]);
  const habits = useMemo(() => tasks.filter(task => task.category === "habit"), [tasks]);
  const budgets = useMemo(() => tasks.filter(task => task.category === "budget"), [tasks]);
  const goals = useMemo(() => tasks.filter(task => task.category === "goal"), [tasks]);

  const addTask = (task: PersonalTask) => setTasks(prev => [...prev, task]);
  const updateTask = (id: string, partial: Partial<PersonalTask>) =>
    setTasks(prev => prev.map(task => (task.id === id ? { ...task, ...partial } : task)));
  const removeTask = (id: string) => {
    if (!window.confirm("¿Eliminar esta tarea personal?")) return;
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const resolveWeeklyOption = (task: PersonalTask) => {
    if (typeof task.dayOfWeek === "number" && task.dayOfWeek >= 1 && task.dayOfWeek <= 7) return task.dayOfWeek;
    const created = parseISODate(task.createdAt) ?? today;
    return jsDayToWeekOption(created.getDay());
  };

  const resolveMonthlyDay = (task: PersonalTask) => {
    const raw = typeof task.dayOfMonth === "number" ? task.dayOfMonth : parseISODate(task.createdAt)?.getDate() ?? 1;
    return Math.min(Math.max(Math.round(raw || 1), 1), 31);
  };

  const isHabitDueToday = (task: PersonalTask) => {
    const last = parseISODate(task.lastCompletedAt);
    const lastIso = last ? isoDateString(last) : null;
    switch (task.frequency) {
      case "daily":
        return lastIso !== todayIso;
      case "weekly": {
        const weeklyOption = resolveWeeklyOption(task);
        const jsDay = weekOptionToJsDay(weeklyOption);
        if (today.getDay() !== jsDay) return false;
        return lastIso !== todayIso;
      }
      case "monthly": {
        const day = resolveMonthlyDay(task);
        if (today.getDate() !== day) return false;
        return lastIso !== todayIso;
      }
      default:
        return false;
    }
  };

  const nextDueDate = (task: PersonalTask): Date | null => {
    const last = parseISODate(task.lastCompletedAt);
    const lastIso = last ? isoDateString(last) : null;
    switch (task.frequency) {
      case "daily": {
        if (lastIso === todayIso) return addDaysToDate(today, 1);
        return today;
      }
      case "weekly": {
        const weeklyOption = resolveWeeklyOption(task);
        const jsDay = weekOptionToJsDay(weeklyOption);
        let diff = (jsDay - today.getDay() + 7) % 7;
        if (diff === 0 && lastIso === todayIso) diff = 7;
        return addDaysToDate(today, diff);
      }
      case "monthly": {
        const day = resolveMonthlyDay(task);
        const daysThisMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
        const clampedDay = Math.min(day, daysThisMonth);
        let candidate = startOfLocalDay(new Date(today.getFullYear(), today.getMonth(), clampedDay));
        if (candidate < today || (candidate.getTime() === today.getTime() && lastIso === todayIso)) {
          const nextMonthDays = getDaysInMonth(today.getFullYear(), today.getMonth() + 1);
          const nextDay = Math.min(day, nextMonthDays);
          candidate = startOfLocalDay(new Date(today.getFullYear(), today.getMonth() + 1, nextDay));
        }
        return candidate;
      }
      case "once":
      default:
        return parseISODate(task.targetDate);
    }
  };

  const handleDecisionSubmit = () => {
    const trimmed = decisionDescription.trim();
    if (!trimmed) return;
    addTask({
      id: cryptoRandomId(),
      category: "decision",
      description: trimmed,
      frequency: "once",
      createdAt: new Date().toISOString(),
      area: decisionArea,
      completed: false,
    });
    setDecisionDescription("");
    setDecisionArea("spiritual");
    setShowDecisionForm(false);
  };

  const handleHabitSubmit = () => {
    const trimmed = habitDescription.trim();
    if (!trimmed) return;
    const base: PersonalTask = {
      id: cryptoRandomId(),
      category: "habit",
      description: trimmed,
      frequency: habitFrequency,
      createdAt: new Date().toISOString(),
      area: habitArea,
      completed: false,
      lastCompletedAt: null,
    };
    if (habitFrequency === "weekly") base.dayOfWeek = habitDayOfWeek;
    if (habitFrequency === "monthly") base.dayOfMonth = habitDayOfMonth;
    addTask(base);
    setHabitDescription("");
    setHabitFrequency("daily");
    setHabitDayOfWeek(1);
    setHabitDayOfMonth(1);
    setHabitArea("spiritual");
    setShowHabitForm(false);
  };

  const handleBudgetSubmit = () => {
    const trimmed = budgetDescription.trim();
    if (!trimmed) return;
    const normalizedAmount = budgetAmount.trim() ? Number(budgetAmount) : null;
    addTask({
      id: cryptoRandomId(),
      category: "budget",
      description: trimmed,
      frequency: "monthly",
      createdAt: new Date().toISOString(),
      area: budgetArea,
      completed: false,
      lastCompletedAt: null,
      dayOfMonth: budgetDayOfMonth,
      amount: normalizedAmount ?? null,
    });
    setBudgetDescription("");
    setBudgetAmount("");
    setBudgetDayOfMonth(1);
    setBudgetArea("financial");
    setShowBudgetForm(false);
  };

  const handleGoalSubmit = () => {
    const trimmed = goalDescription.trim();
    if (!trimmed) return;
    addTask({
      id: cryptoRandomId(),
      category: "goal",
      description: trimmed,
      frequency: "once",
      createdAt: new Date().toISOString(),
      area: goalArea,
      completed: false,
      targetDate: goalTargetDate || null,
    });
    setGoalDescription("");
    setGoalTargetDate("");
    setGoalArea("spiritual");
    setShowGoalForm(false);
  };

  const registerHabitToday = (task: PersonalTask) => {
    updateTask(task.id, { lastCompletedAt: new Date().toISOString() });
  };

  const toggleCompletion = (task: PersonalTask) => {
    if (task.completed) {
      updateTask(task.id, { completed: false, completedAt: null });
    } else {
      updateTask(task.id, { completed: true, completedAt: new Date().toISOString() });
    }
  };

  const celebrateDecision = (task: PersonalTask) => {
    if (task.completed) {
      updateTask(task.id, { completed: false, completedAt: null });
    } else {
      updateTask(task.id, { completed: true, completedAt: new Date().toISOString() });
    }
  };

  const agendaCardBase = "rounded-xl border border-mana-primary/10 bg-white/85 shadow-sm";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className={agendaCardBase}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg text-mana-primary">Decisiones espirituales</CardTitle>
              <p className="text-xs text-mana-muted">Registra compromisos que deseas mantener delante de Dios.</p>
            </div>
            <Button size="sm" className="shadow-sm" onClick={() => setShowDecisionForm(value => !value)}>
              <Plus className="mr-1 h-4 w-4" /> Nueva decisión
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-mana-ink/80">
            {showDecisionForm && (
              <div className="space-y-3 rounded-xl border border-mana-primary/15 bg-white/90 p-4">
                <div>
                  <Label>Decisión</Label>
                  <Textarea rows={3} value={decisionDescription} onChange={e => setDecisionDescription(e.target.value)} placeholder="Describe la decisión o pacto que asumes hoy." />
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={decisionArea} onValueChange={value => setDecisionArea(value as AreaKey)}>
                    <SelectTrigger><SelectValue placeholder="Área principal" /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map(area => (<SelectItem key={area.key} value={area.key}>{area.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowDecisionForm(false); setDecisionDescription(""); }}>Cancelar</Button>
                  <Button onClick={handleDecisionSubmit} disabled={!decisionDescription.trim()}>Guardar</Button>
                </div>
              </div>
            )}

            {decisions.length === 0 && !showDecisionForm && (
              <div className="rounded-xl border border-dashed border-mana-primary/20 bg-white/70 p-4 text-sm text-mana-muted">
                Aquí aparecerán tus decisiones espirituales. Presiona “Nueva decisión” para registrar la primera.
              </div>
            )}

            {decisions.map(task => (
              <div key={task.id} className={cn("rounded-xl border bg-white/80 p-4 transition-shadow hover:shadow-sm", task.completed ? "border-green-300 bg-green-50 shadow-sm" : "border-mana-primary/10")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-mana-primary">{task.description}</p>
                    <p className="text-xs text-mana-muted">Registrada el {formatISODate(task.createdAt)} · Área {areaLabel(task.area)}</p>
                    {task.completed && <p className="text-xs text-green-600">Celebrada el {formatISODate(task.completedAt)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => celebrateDecision(task)}>
                      {task.completed ? "Reabrir" : "Celebrar"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-mana-muted" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={agendaCardBase}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg text-mana-primary">Hábitos y retos prácticos</CardTitle>
              <p className="text-xs text-mana-muted">Diseña rutinas que te acerquen a tus metas.</p>
            </div>
            <Button size="sm" className="shadow-sm" onClick={() => setShowHabitForm(value => !value)}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo hábito
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-mana-ink/80">
            {showHabitForm && (
              <div className="space-y-3 rounded-xl border border-mana-primary/15 bg-white/90 p-4">
                <div>
                  <Label>Hábito o reto</Label>
                  <Textarea rows={2} value={habitDescription} onChange={e => setHabitDescription(e.target.value)} placeholder="Describe el hábito que deseas cultivar." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Frecuencia</Label>
                    <Select value={habitFrequency} onValueChange={value => setHabitFrequency(value as TaskFrequency)}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Área</Label>
                    <Select value={habitArea} onValueChange={value => setHabitArea(value as AreaKey)}>
                      <SelectTrigger><SelectValue placeholder="Área principal" /></SelectTrigger>
                      <SelectContent>
                        {AREAS.map(area => (<SelectItem key={area.key} value={area.key}>{area.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {habitFrequency === "weekly" && (
                  <div>
                    <Label>Día de la semana</Label>
                    <Select value={String(habitDayOfWeek)} onValueChange={value => setHabitDayOfWeek(parseInt(value, 10))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona el día" /></SelectTrigger>
                      <SelectContent>
                        {WEEKDAY_OPTIONS.map(option => (<SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {habitFrequency === "monthly" && (
                  <div>
                    <Label>Día del mes</Label>
                    <Input type="number" min={1} max={31} value={habitDayOfMonth} onChange={e => setHabitDayOfMonth(Math.min(Math.max(Number(e.target.value) || 1, 1), 31))} />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowHabitForm(false); setHabitDescription(""); }}>Cancelar</Button>
                  <Button onClick={handleHabitSubmit} disabled={!habitDescription.trim()}>Guardar</Button>
                </div>
              </div>
            )}

            {habits.length === 0 && !showHabitForm && (
              <div className="rounded-xl border border-dashed border-mana-primary/20 bg-white/70 p-4 text-sm text-mana-muted">
                Crea hábitos prácticos como ayuno semanal, lectura diaria o tiempos de ejercicio.
              </div>
            )}

            {habits.map(task => {
              const dueToday = isHabitDueToday(task);
              const next = nextDueDate(task);
              return (
                <div key={task.id} className={cn("rounded-xl border p-4 transition-all", dueToday ? "border-red-300 bg-red-50 shadow-sm" : "border-mana-primary/10 bg-white/80 hover:shadow-sm")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-mana-primary">{task.description}</p>
                      <p className="text-xs text-mana-muted">
                        Frecuencia: {task.frequency === "daily" ? "Diario" : task.frequency === "weekly" ? `Semanal (${WEEKDAY_OPTIONS.find(option => option.value === resolveWeeklyOption(task))?.label ?? "día"})` : "Mensual"}
                        {" · "}Área {areaLabel(task.area)}
                      </p>
                      {dueToday && <p className="text-xs text-red-600">Pendiente hoy</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="shadow-sm" onClick={() => registerHabitToday(task)}>
                        <Check className="mr-1 h-4 w-4" /> Registrar hoy
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-mana-muted" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-mana-muted">Próximo: {next ? dateFormatter.format(next) : "—"}</div>
                  {task.lastCompletedAt && (
                    <div className="text-xs text-mana-muted">Último registro: {formatISODate(task.lastCompletedAt)}</div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={agendaCardBase}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg text-mana-primary">Compromisos financieros</CardTitle>
              <p className="text-xs text-mana-muted">Administra diezmos, ofrendas, ahorros y pagos importantes.</p>
            </div>
            <Button size="sm" className="shadow-sm" onClick={() => setShowBudgetForm(value => !value)}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo compromiso
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-mana-ink/80">
            {showBudgetForm && (
              <div className="space-y-3 rounded-xl border border-mana-primary/15 bg-white/90 p-4">
                <div>
                  <Label>Compromiso financiero</Label>
                  <Textarea rows={2} value={budgetDescription} onChange={e => setBudgetDescription(e.target.value)} placeholder="Describe el compromiso, por ejemplo: 'Dar diezmo el primer domingo de cada mes'." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Monto (opcional)</Label>
                    <Input type="number" min="0" step="0.01" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="p. ej. 100000" />
                  </div>
                  <div>
                    <Label>Día del mes</Label>
                    <Input type="number" min={1} max={31} value={budgetDayOfMonth} onChange={e => setBudgetDayOfMonth(Math.min(Math.max(Number(e.target.value) || 1, 1), 31))} />
                  </div>
                </div>
                <div>
                  <Label>Área</Label>
                  <Select value={budgetArea} onValueChange={value => setBudgetArea(value as AreaKey)}>
                    <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map(area => (<SelectItem key={area.key} value={area.key}>{area.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowBudgetForm(false); setBudgetDescription(""); }}>Cancelar</Button>
                  <Button onClick={handleBudgetSubmit} disabled={!budgetDescription.trim()}>Guardar</Button>
                </div>
              </div>
            )}

            {budgets.length === 0 && !showBudgetForm && (
              <div className="rounded-xl border border-dashed border-mana-primary/20 bg-white/70 p-4 text-sm text-mana-muted">
                Registra compromisos como diezmo, ahorro mensual o pagos de deudas.
              </div>
            )}

            {budgets.map(task => {
              const dueToday = isHabitDueToday({ ...task, frequency: "monthly" });
              const next = nextDueDate(task);
              return (
                <div key={task.id} className={cn("rounded-xl border p-4 transition-all", dueToday ? "border-red-300 bg-red-50 shadow-sm" : "border-mana-primary/10 bg-white/80 hover:shadow-sm")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-mana-primary">{task.description}</p>
                      <p className="text-xs text-mana-muted">
                        Día {resolveMonthlyDay(task)} de cada mes · Área {areaLabel(task.area)}
                      </p>
                      {task.amount != null && <p className="text-xs text-mana-muted">Monto estimado: ${task.amount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}</p>}
                      {dueToday && <p className="text-xs text-red-600">Pendiente hoy</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="shadow-sm" onClick={() => registerHabitToday(task)}>
                        <Check className="mr-1 h-4 w-4" /> Registrar pago
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-mana-muted" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-mana-muted">Próximo: {next ? dateFormatter.format(next) : "—"}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className={agendaCardBase}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg text-mana-primary">Metas con fecha límite</CardTitle>
              <p className="text-xs text-mana-muted">Convierte tus sueños en compromisos con fecha.</p>
            </div>
            <Button size="sm" className="shadow-sm" onClick={() => setShowGoalForm(value => !value)}>
              <Plus className="mr-1 h-4 w-4" /> Nueva meta
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-mana-ink/80">
            {showGoalForm && (
              <div className="space-y-3 rounded-xl border border-mana-primary/15 bg-white/90 p-4">
                <div>
                  <Label>Meta</Label>
                  <Textarea rows={2} value={goalDescription} onChange={e => setGoalDescription(e.target.value)} placeholder="Describe la meta. Ej: 'Leer la Biblia completa'." />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Fecha objetivo</Label>
                    <Input type="date" value={goalTargetDate} onChange={e => setGoalTargetDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Área</Label>
                    <Select value={goalArea} onValueChange={value => setGoalArea(value as AreaKey)}>
                      <SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger>
                      <SelectContent>
                        {AREAS.map(area => (<SelectItem key={area.key} value={area.key}>{area.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowGoalForm(false); setGoalDescription(""); }}>Cancelar</Button>
                  <Button onClick={handleGoalSubmit} disabled={!goalDescription.trim()}>Guardar</Button>
                </div>
              </div>
            )}

            {goals.length === 0 && !showGoalForm && (
              <div className="rounded-xl border border-dashed border-mana-primary/20 bg-white/70 p-4 text-sm text-mana-muted">
                Define metas medibles con fecha límite para mantenerte enfocado.
              </div>
            )}

            {goals.map(task => {
              const target = parseISODate(task.targetDate);
              const isOverdue = target ? target < today && !task.completed : false;
              const isDueToday = target ? isoDateString(target) === todayIso && !task.completed : false;
              return (
                <div key={task.id} className={cn("rounded-xl border p-4 transition-all", task.completed ? "border-green-300 bg-green-50 shadow-sm" : isOverdue ? "border-red-300 bg-red-50 shadow-sm" : "border-mana-primary/10 bg-white/80 hover:shadow-sm")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-mana-primary">{task.description}</p>
                      <p className="text-xs text-mana-muted">
                        {task.targetDate ? `Objetivo: ${formatISODate(task.targetDate)}` : "Sin fecha definida"} · Área {areaLabel(task.area)}
                      </p>
                      {isDueToday && <p className="text-xs text-red-600">¡Hoy es el día para completar esta meta!</p>}
                      {task.completed && <p className="text-xs text-green-600">Lograda el {formatISODate(task.completedAt)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={task.completed ? "secondary" : "default"} onClick={() => toggleCompletion(task)}>
                        {task.completed ? "Marcar pendiente" : "Marcar lograda"}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-mana-muted" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-none bg-white/85 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-base text-mana-primary">Cómo usar Mis tareas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-mana-ink/80">
            <p>Esta sección complementa los 21 retos con compromisos personalizados. Usa las categorías para mantener orden y mide tu avance.</p>
            <ul className="space-y-2 text-sm text-mana-ink/70">
              <li>• <span className="font-medium text-mana-primary">Decisiones:</span> pactos espirituales o personales de largo plazo.</li>
              <li>• <span className="font-medium text-mana-primary">Hábitos:</span> acciones repetitivas que requieren constancia.</li>
              <li>• <span className="font-medium text-mana-primary">Compromisos financieros:</span> recuerda aportes, ahorros y pagos clave.</li>
              <li>• <span className="font-medium text-mana-primary">Metas:</span> define la fecha límite para cada sueño y celébralo al lograrlo.</li>
            </ul>
            <p className="text-xs text-mana-muted">Tip: agenda alarmas o notificaciones adicionales si deseas recibir recordatorios en tu dispositivo.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BudgetPlanner({ budgetState, setBudgetState, onOpenReference }: BudgetPlannerProps) {
  useEffect(() => {
    setBudgetState(prev => {
      const key = prev.activeMonth || new Date().toISOString().slice(0, 7);
      if (prev.months[key]) return prev;
      return {
        ...prev,
        activeMonth: key,
        months: { ...prev.months, [key]: createBudgetMonthState(key) },
      };
    });
  }, [setBudgetState]);

  const activeMonth =
    budgetState.activeMonth ||
    Object.keys(budgetState.months).sort()[0] ||
    new Date().toISOString().slice(0, 7);
  const currentMonth = budgetState.months[activeMonth] ?? createBudgetMonthState(activeMonth);

  const updateCurrentMonth = useCallback(
    (updater: (month: BudgetMonth) => BudgetMonth) => {
      setBudgetState(prev => {
        const key = prev.activeMonth || activeMonth;
        const month = prev.months[key] ?? createBudgetMonthState(key);
        const nextMonth = updater(month);
        return {
          ...prev,
          activeMonth: key,
          months: {
            ...prev.months,
            [key]: nextMonth,
          },
        };
      });
    },
    [activeMonth, setBudgetState]
  );

  const handleMonthChange = (value: string) => {
    const fallback = new Date().toISOString().slice(0, 7);
    const nextKey = value || fallback;
    setBudgetState(prev => {
      const month = prev.months[nextKey] ?? createBudgetMonthState(nextKey);
      return {
        ...prev,
        activeMonth: nextKey,
        months: {
          ...prev.months,
          [nextKey]: month,
        },
      };
    });
  };

  const handleIncomeChange = (value: string) => {
    const amount = sanitizeNumber(value, 0);
    updateCurrentMonth(month => ({ ...month, income: Math.max(0, amount) }));
  };

  const handleAllocationChange = (key: BudgetCategoryKey, value: number) => {
    updateCurrentMonth(month => ({
      ...month,
      allocations: {
        ...month.allocations,
        [key]: clampPercent(value),
      },
    }));
  };

  const resetAllocations = () => {
    updateCurrentMonth(month => ({
      ...month,
      allocations: createBudgetAllocations(),
    }));
  };

  const monthEntries = useMemo(
    () => currentMonth.entries.filter(entry => entry.month === currentMonth.month),
    [currentMonth.entries, currentMonth.month]
  );

  const categoryTotals = useMemo(() => {
    const totals = BUDGET_CATEGORIES.reduce<Record<BudgetCategoryKey, number>>((acc, category) => {
      acc[category.key] = 0;
      return acc;
    }, {} as Record<BudgetCategoryKey, number>);
    monthEntries.forEach(entry => {
      totals[entry.category] += entry.amount;
    });
    return totals;
  }, [monthEntries]);

  const allocationTotal = useMemo(
    () => BUDGET_CATEGORIES.reduce((sum, category) => sum + (currentMonth.allocations[category.key] ?? 0), 0),
    [currentMonth.allocations]
  );

  const totalSpent = useMemo(
    () => Object.values(categoryTotals).reduce((sum, value) => sum + value, 0),
    [categoryTotals]
  );

  const formatMonthLabel = (value: string) => {
    if (!value) return "";
    const [year, month] = value.split("-");
    const base = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(base);
  };

  const activeMonthLabel = formatMonthLabel(activeMonth);

  const [expenseCategory, setExpenseCategory] = useState<BudgetCategoryKey>("generosity");
  const NONE_SUBCATEGORY = "__none__";
  const [expenseSubcategory, setExpenseSubcategory] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDescription, setExpenseDescription] = useState<string>("");

  useEffect(() => {
    const category = BUDGET_CATEGORIES.find(item => item.key === expenseCategory);
    if (!category) return;
    if (!category.subcategories.length) {
      setExpenseSubcategory(null);
      return;
    }
    if (expenseSubcategory !== null && !category.subcategories.includes(expenseSubcategory)) {
      setExpenseSubcategory(category.subcategories[0] ?? null);
    }
  }, [expenseCategory, expenseSubcategory]);

  const addExpenseEntry = () => {
    const amount = sanitizeNumber(expenseAmount, 0);
    if (amount <= 0) {
      window.alert("Ingresa un monto mayor a 0.");
      return;
    }
    const description = expenseDescription.trim();
    updateCurrentMonth(month => ({
      ...month,
      entries: [
        {
          id: cryptoRandomId(),
          month: month.month,
          category: expenseCategory,
          subcategory: expenseSubcategory || null,
          amount,
          description: description || null,
          createdAt: new Date().toISOString(),
        },
        ...month.entries,
      ],
    }));
    setExpenseAmount("");
    setExpenseDescription("");
  };

  const removeExpenseEntry = (id: string) => {
    updateCurrentMonth(month => ({
      ...month,
      entries: month.entries.filter(entry => entry.id !== id),
    }));
  };

  const reserveTithe = () => {
    if (currentMonth.income <= 0) {
      window.alert("Define primero tu ingreso mensual para calcular el diezmo.");
      return;
    }
    const amount = Math.round(currentMonth.income * 0.1 * 100) / 100;
    updateCurrentMonth(month => ({
      ...month,
      entries: [
        {
          id: cryptoRandomId(),
          month: month.month,
          category: "generosity",
          subcategory: "Diezmo",
          amount,
          description: "Reserva del diezmo",
          createdAt: new Date().toISOString(),
        },
        ...month.entries,
      ],
    }));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);

  const recommendedMap = useMemo(() => createBudgetAllocations(), []);

  const subcategoryOptions =
    BUDGET_CATEGORIES.find(item => item.key === expenseCategory)?.subcategories ?? [];

  const deviationMessage =
    allocationTotal !== 100
      ? `Tus porcentajes suman ${allocationTotal}%. Ajusta para llegar a 100%.`
      : "¡Muy bien! Tus porcentajes suman 100%.";

  const generosityTarget = currentMonth.income * (currentMonth.allocations.generosity / 100);
  const generositySpent = categoryTotals.generosity;

  return (
    <Card className="border-none bg-white/90 shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="font-display text-lg text-mana-primary">Presupuesto de fe</CardTitle>
          <p className="text-xs text-mana-muted">
            Honra a Dios con lo primero y administra con sabiduría cada peso.
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-mana-primary">{activeMonthLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={activeMonth}
            onChange={e => handleMonthChange(e.target.value)}
            className="w-40"
            lang="es-ES"
          />
          <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={reserveTithe}>
            Reservar 10&nbsp;% para Dios
          </Button>
          <Link
            href="https://devocionalmana.com/donaciones/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-mana-secondary underline underline-offset-4"
          >
            Dar a la obra
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <div className="space-y-4 rounded-2xl border border-mana-primary/15 bg-white/95 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>Ingreso mensual</Label>
                <Input
                  type="number"
                  min="0"
                  value={currentMonth.income || ""}
                  onChange={e => handleIncomeChange(e.target.value)}
                  placeholder="Ingresa tu ingreso neto"
                />
              </div>
              <div className="sm:col-span-1">
                <Label>Total asignado</Label>
                <Input value={formatCurrency(totalSpent)} readOnly />
              </div>
            </div>

            <div className="rounded-xl border border-mana-primary/10 bg-mana-primary/5 p-3 text-xs text-mana-muted">
              <p>
                Recomendación: 10 % generosidad · 45 % esenciales · 25 % deudas/ahorro · 20 % ocio y crecimiento.
                Ajusta si lo necesitas, pero aparta primero para el Señor.
              </p>
            </div>

            <div className="space-y-4">
              {BUDGET_CATEGORIES.map(category => {
                const allocation = currentMonth.allocations[category.key] ?? category.recommended;
                const targetAmount = currentMonth.income * (allocation / 100);
                const spent = categoryTotals[category.key];
                const completion = targetAmount > 0 ? Math.min(100, Math.round((spent / targetAmount) * 100)) : 0;
                const actualShare = currentMonth.income > 0 ? Math.round((spent / currentMonth.income) * 1000) / 10 : 0;
                const recommended = recommendedMap[category.key];
                return (
                  <div key={category.key} className="space-y-2 rounded-xl border border-mana-primary/10 bg-white/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-mana-primary">{category.name}</p>
                        <p className="text-xs text-mana-muted">
                          {onOpenReference
                            ? renderWithScriptureLinks(category.description, onOpenReference)
                            : category.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-mana-muted">
                        <div><span className="font-semibold text-mana-primary">{allocation}%</span> del ingreso</div>
                        <div>Meta: {formatCurrency(targetAmount || 0)}</div>
                        <div>Gastado: <span className={spent > targetAmount ? "text-red-600" : "text-mana-primary"}>{formatCurrency(spent)}</span></div>
                      </div>
                    </div>
                    <Slider
                      value={[allocation]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={value => handleAllocationChange(category.key, value[0])}
                    />
                    <div className="flex items-center gap-2 text-xs text-mana-muted">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={allocation}
                        onChange={e => handleAllocationChange(category.key, Number(e.target.value))}
                        className="h-8 w-16"
                      />
                      <span>Recomendado: {recommended}% · Actual: {actualShare}% del gasto</span>
                    </div>
                    <div className="h-2 rounded-full bg-mana-primary/10">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, completion)}%`, backgroundColor: category.color }}
                      ></div>
                    </div>
                    {spent > targetAmount && (
                      <div className="text-xs text-red-600">
                        Has sobrepasado la meta de {category.name.toLowerCase()} por {formatCurrency(spent - targetAmount)}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className={allocationTotal === 100 ? "text-green-600" : "text-red-600"}>{deviationMessage}</span>
              <Button variant="ghost" size="sm" onClick={resetAllocations}>Restaurar porcentajes recomendados</Button>
            </div>

            <div className="rounded-xl border border-dashed border-mana-primary/20 bg-white/80 p-4">
              <p className="font-medium text-mana-primary">Registrar gasto</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Categoría</Label>
                  <Select value={expenseCategory} onValueChange={value => setExpenseCategory(value as BudgetCategoryKey)}>
                    <SelectTrigger className="h-11 w-full rounded-xl border border-mana-primary/20 bg-white px-4">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_CATEGORIES.map(category => (
                        <SelectItem key={category.key} value={category.key}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategoría (opcional)</Label>
                  <Select
                    value={
                      subcategoryOptions.length
                        ? expenseSubcategory ?? NONE_SUBCATEGORY
                        : NONE_SUBCATEGORY
                    }
                    onValueChange={value => setExpenseSubcategory(value === NONE_SUBCATEGORY ? null : value)}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border border-mana-primary/20 bg-white px-4">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SUBCATEGORY}>Sin especificar</SelectItem>
                      {subcategoryOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="h-11 rounded-xl border border-mana-primary/20 bg-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={expenseDescription}
                    onChange={e => setExpenseDescription(e.target.value)}
                    placeholder="¿Qué registras?"
                    className="h-11 rounded-xl border border-mana-primary/20 bg-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
                <Button className="h-11 rounded-xl shadow-sm sm:w-auto" onClick={addExpenseEntry}>Agregar gasto</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-mana-primary/15 bg-white/90 p-4">
            <div>
              <p className="font-display text-base text-mana-primary">Resumen bíblico</p>
              <ul className="mt-2 space-y-2 text-sm text-mana-ink/80">
                <li>• Diezmo reservado: {formatCurrency(generosityTarget || 0)} · Registrado: {formatCurrency(generositySpent)}</li>
                <li>• Total invertido este mes: {formatCurrency(totalSpent)}</li>
                <li>• Ingreso disponible restante: {formatCurrency(Math.max(0, currentMonth.income - totalSpent))}</li>
                <li>• Comparte tu presupuesto con alguien de confianza para rendir cuentas.</li>
              </ul>
            </div>

            <div>
              <p className="font-display text-sm text-mana-primary">Movimientos recientes</p>
              {monthEntries.length === 0 ? (
                <p className="mt-2 text-xs text-mana-muted">Aún no registras gastos en {activeMonth}. Empieza agregando el primero.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {monthEntries.slice(0, 6).map(entry => {
                    const category = BUDGET_CATEGORIES.find(item => item.key === entry.category);
                    return (
                      <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-mana-primary/10 bg-white/80 p-2 text-xs">
                        <div>
                          <p className="font-medium text-mana-primary">
                            {category?.name ?? entry.category} {entry.subcategory ? `· ${entry.subcategory}` : ""}
                          </p>
                          <p className="text-mana-muted">{entry.description ?? "Sin nota"} · {new Date(entry.createdAt).toLocaleDateString("es-CO")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-mana-primary">{formatCurrency(entry.amount)}</span>
                          <Button size="icon" variant="ghost" onClick={() => removeExpenseEntry(entry.id)}>
                            <Trash2 className="h-4 w-4 text-mana-muted" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {monthEntries.length > 6 && (
              <p className="text-xs text-mana-muted">Mostrando los 6 movimientos más recientes.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============== DIARIO ==============
function JournalSection({ diary, setDiary }: JournalSectionProps) {
  const [text, setText] = useState("");
  function add(){
    const trimmed = text.trim();
    if (!trimmed) return;
    setDiary(prev => [{ date: new Date().toLocaleString(), text: trimmed }, ...prev]);
    setText("");
  }
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border-none bg-white/85 shadow-sm md:col-span-1">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Nueva entrada</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-mana-ink/80">
          <Textarea rows={6} value={text} onChange={(e)=> setText(e.target.value)} placeholder="Escribe una reflexión…"/>
          <Button className="shadow-sm" onClick={add}>Guardar</Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-white/85 shadow-sm md:col-span-2">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Mi diario</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {diary.length===0 && <div className="text-sm text-mana-muted">Aún no hay entradas.</div>}
          {diary.map((it, i) => (
            <div key={i} className="rounded-xl border border-mana-primary/10 bg-white/80 p-3">
              <div className="text-xs uppercase tracking-wide text-mana-muted">{it.date}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-mana-ink/80">{it.text}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== COMPROMISO ==============
function CommitmentSection({ signature, setSignature, setTab, setFinalAssess, areaScores }: CommitmentSectionProps) {
  const [phrase, setPhrase] = useState("Hoy decido servir a Cristo con todo mi corazón.");
  const [checked, setChecked] = useState<boolean>(!!signature);
  function sign(){ setChecked(true); setSignature("signed"); setFinalAssess(areaScores); }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-none bg-white/90 shadow-sm">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Compromiso final</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-mana-ink/80">
          <Label className="text-mana-muted">Frase</Label>
          <Textarea rows={3} value={phrase} onChange={(e)=> setPhrase(e.target.value)} />
          <div className="flex items-center gap-2"><Checkbox checked={checked} onCheckedChange={(v)=> setChecked(!!v)} /> <span>Confirmo mi decisión</span></div>
          <Button className="shadow-sm" onClick={sign}><Signature className="mr-2 h-4 w-4"/>Firmar y finalizar</Button>
          <p className="text-xs text-mana-muted">(Demo: genera estado de firma y copia el radar &quot;Después&quot; con tu avance actual por áreas.)</p>
          <Button variant="secondary" className="border border-mana-primary/20 text-mana-primary" onClick={()=> setTab("home")}>Volver al inicio</Button>
        </CardContent>
      </Card>
      <Card className="border-none bg-white/95 shadow-mana">
        <CardHeader><CardTitle className="font-display text-lg text-mana-primary">Certificado (vista previa)</CardTitle></CardHeader>
        <CardContent className="rounded-2xl border border-mana-primary/10 bg-white p-6">
          <div className="text-center">
            <h2 className="font-display text-2xl font-semibold text-mana-primary">Certificado de compromiso</h2>
            <p className="text-sm text-mana-muted">Se otorga a</p>
            <div className="mt-1 font-display text-2xl font-semibold text-mana-ink">Nombre del participante</div>
            <p className="mt-2 text-sm text-mana-ink/80">{phrase}</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5"/>Completó los 21 retos</div>
            <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={AREAS.map(area => ({
                  subject: area.name,
                  Progreso: areaScores[area.key],
                }))}
              >
                <PolarGrid stroke="#D2D9ED" radialLines={false} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#1B2440", fontSize: 11 }} tickLine={false} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fill: "#94A3C6", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />
                <Radar
                  name="Progreso"
                  dataKey="Progreso"
                  stroke="#1E3A8A"
                  strokeWidth={2}
                  fill="#1E3A8A"
                  fillOpacity={0.35}
                  dot
                  activeDot={{ r: 6, fill: "#0EA5A3", stroke: "#fff", strokeWidth: 2 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}/10`, "Progreso"]}
                  labelFormatter={(label: string) => `Área: ${label}`}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-mana-muted">*Generación de PDF real se haría en producción.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// util
function cryptoRandomId(){
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
