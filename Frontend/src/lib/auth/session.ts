import { z } from 'zod';
import { SESSION_STORAGE_KEY, STAFF_ROLES } from '@/constants/auth';

const sessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.number(),
  user: z.object({
    username: z.string(),
    role: z.enum(STAFF_ROLES),
    outletId: z.string().nullable(),
  }),
});

export type Session = z.infer<typeof sessionSchema>;

type Listener = () => void;

const listeners = new Set<Listener>();
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

function readRaw(): string | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored !== null) return stored;
  } catch {
    // WHY: storage can be blocked (privacy mode), so the in-memory copy below keeps this tab signed in.
  }
  return memoryRaw;
}

function writeRaw(raw: string | null): void {
  memoryRaw = raw;
  try {
    if (raw === null) sessionStorage.removeItem(SESSION_STORAGE_KEY);
    else sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
  } catch {
    // WHY: a failed write must not break login, the in-memory copy still holds the session.
  }
  listeners.forEach((listener) => listener());
}

function parse(raw: string | null): Session | null {
  if (raw === null) return null;
  try {
    const result = sessionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// WHY: the parsed object is cached per raw string so useSyncExternalStore gets a stable snapshot.
export function getSession(): Session | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
  }
  if (cachedSession && cachedSession.expiresAt <= Date.now()) return null;
  return cachedSession;
}

export function setSession(session: Session): void {
  writeRaw(JSON.stringify(session));
}

export function clearSession(): void {
  if (readRaw() === null) return;
  writeRaw(null);
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
