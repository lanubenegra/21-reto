export type BudgetCategoryKey = "generosity" | "essentials" | "debt_savings" | "growth";

export interface BudgetEntry {
  id: string;
  month: string;
  category: BudgetCategoryKey;
  subcategory?: string | null;
  amount: number;
  description?: string | null;
  createdAt: string;
}

export interface BudgetMonth {
  month: string;
  income: number;
  allocations: Record<BudgetCategoryKey, number>;
  entries: BudgetEntry[];
  notes?: string | null;
}

export interface BudgetState {
  activeMonth: string;
  months: Record<string, BudgetMonth>;
}

export type TaskCategory = "decision" | "habit" | "budget" | "goal";
export type TaskFrequency = "once" | "daily" | "weekly" | "monthly";

export interface PersonalTask {
  id: string;
  category: TaskCategory;
  description: string;
  frequency: TaskFrequency;
  createdAt: string;
  area?: string | null;
  targetDate?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  lastCompletedAt?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  amount?: number | null;
  notes?: string | null;
}

export interface UserState {
  initialAssess: Record<string, number>;
  finalAssess: Record<string, number>;
  entries: Record<string, unknown>;
  completedDays: number[];
  planStartDate: string | null;
  diary: Array<{ date: string; text: string }>;
  goals: Array<Record<string, unknown>>;
  goalLogs: Array<{ goalId: string; date: string; completed: boolean }>;
  signature: string | null;
  actionDates: string[];
  personalTasks: PersonalTask[];
  budget: BudgetState;
}

const defaultBudgetAllocations = (): Record<BudgetCategoryKey, number> => ({
  generosity: 10,
  essentials: 45,
  debt_savings: 25,
  growth: 20,
});

const createBudgetMonth = (month: string): BudgetMonth => ({
  month,
  income: 0,
  allocations: defaultBudgetAllocations(),
  entries: [],
  notes: null,
});

export const emptyBudgetState = (): BudgetState => {
  const month = new Date().toISOString().slice(0, 7);
  return {
    activeMonth: month,
    months: {
      [month]: createBudgetMonth(month),
    },
  };
};

export const emptyUserState = (): UserState => ({
  initialAssess: {},
  finalAssess: {},
  entries: {},
  completedDays: [],
  planStartDate: null,
  diary: [],
  goals: [],
  goalLogs: [],
  signature: null,
  actionDates: [],
  personalTasks: [],
  budget: emptyBudgetState(),
});
