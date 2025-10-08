import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DATA_ROOT = process.cwd();
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "21-retos") : path.join(DATA_ROOT, "data");
const DATA_PATH = path.join(DATA_DIR, "users.json");
const SEED_PATH = path.join(DATA_ROOT, "data", "users.json");

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type ResetToken = {
  token: string;
  userId: string;
  expiresAt: number;
};

interface UsersFile {
  users: StoredUser[];
  resetTokens: ResetToken[];
}

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const seed = await fs.readFile(SEED_PATH, "utf8");
      await fs.writeFile(DATA_PATH, seed, "utf8");
    } catch {
      const initial: UsersFile = { users: [], resetTokens: [] };
      await fs.writeFile(DATA_PATH, JSON.stringify(initial, null, 2), "utf8");
    }
  }
}

async function readFile(): Promise<UsersFile> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    return JSON.parse(raw) as UsersFile;
  } catch {
    const fallback: UsersFile = { users: [], resetTokens: [] };
    await fs.writeFile(DATA_PATH, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeFile(payload: UsersFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export async function createUser(name: string, email: string, password: string) {
  const normalizedEmail = email.toLowerCase();
  const store = await readFile();
  const exists = store.users.find(user => user.email === normalizedEmail);
  if (exists) {
    throw new Error("Ya existe una cuenta con este correo electrónico.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  await writeFile(store);
  return user;
}

export async function verifyUser(email: string, password: string) {
  const store = await readFile();
  const user = store.users.find(u => u.email === email.toLowerCase());
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}

export async function getUserById(id: string) {
  const store = await readFile();
  return store.users.find(u => u.id === id) ?? null;
}

export async function getUserByEmail(email: string) {
  const store = await readFile();
  return store.users.find(u => u.email === email.toLowerCase()) ?? null;
}

export async function createResetToken(email: string) {
  const store = await readFile();
  const user = store.users.find(u => u.email === email.toLowerCase());
  if (!user) return null;
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hora
  store.resetTokens = store.resetTokens.filter(entry => entry.userId !== user.id);
  store.resetTokens.push({ token, userId: user.id, expiresAt });
  await writeFile(store);
  return { token, expiresAt };
}

export async function consumeResetToken(token: string) {
  const store = await readFile();
  const record = store.resetTokens.find(entry => entry.token === token);
  if (!record || record.expiresAt < Date.now()) {
    return null;
  }
  store.resetTokens = store.resetTokens.filter(entry => entry.token !== token);
  await writeFile(store);
  return record.userId;
}

export async function updatePassword(userId: string, newPassword: string) {
  const store = await readFile();
  const user = store.users.find(u => u.id === userId);
  if (!user) throw new Error("Usuario no encontrado");
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await writeFile(store);
}

export type { StoredUser };
