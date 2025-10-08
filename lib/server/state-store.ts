import { promises as fs } from "fs";
import path from "path";
import { emptyUserState, type UserState } from "@/lib/user-state";

const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "user-state.json");

async function ensureStore() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify({}), "utf8");
  }
}

async function readStore(): Promise<Record<string, UserState>> {
  await ensureStore();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    return JSON.parse(raw) as Record<string, UserState>;
  } catch {
    return {};
  }
}

export async function getUserState(email: string): Promise<UserState> {
  const store = await readStore();
  return { ...emptyUserState(), ...(store[email] ?? {}) };
}

export async function setUserState(email: string, state: UserState): Promise<void> {
  const store = await readStore();
  store[email] = { ...emptyUserState(), ...state };
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}
