import {
  ApiErrorBodySchema,
  DemoSessionSchema,
  FieldSchema,
  PowerDailySchema,
  RotationSchema,
  WaterBalanceSchema,
  type Field,
  type IrrigationType,
  type Polygon,
  type PowerDaily,
  type Rotation,
  type WaterBalance,
} from "@sat2soil/contracts";
import { z } from "zod";

/** Single place for the API base URL (W00.3). Vercel sets it per environment. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

const SESSION_KEY = "sat2soil.demoSession";
const TIMEOUT_MS = 30_000; // Render free instances can take ~30 s to wake up.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Session = { token: string; expires_at: string };

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    // Renew a little before expiry so a request never carries a token that dies mid-flight.
    return new Date(session.expires_at).getTime() - Date.now() > 60_000 ? session : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode or blocked storage: the session simply lives for this page view.
  }
}

let pendingSession: Promise<Session> | null = null;

/** Demo session token (D-009). Created on first write, reused until it expires. */
async function ensureSession(): Promise<Session> {
  const existing = readSession();
  if (existing) return existing;
  pendingSession ??= request("/v1/demo/session", { method: "POST" }, DemoSessionSchema).then((created) => {
    writeSession(created);
    pendingSession = null;
    return created;
  });
  return pendingSession;
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: "optional" | "required" },
  schema: z.ZodType<T>,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.auth === "required") headers.set("Authorization", `Bearer ${(await ensureSession()).token}`);
  if (init.auth === "optional") {
    const session = typeof window === "undefined" ? null : readSession();
    if (session) headers.set("Authorization", `Bearer ${session.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, "network", "The Sat2Soil service is not reachable.");
  }

  if (response.status === 401 && init.auth) writeSession(null);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const parsed = ApiErrorBodySchema.safeParse(body);
    if (parsed.success) throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.message);
    const detail = Array.isArray(body?.detail) ? body.detail.join(" ") : (body?.detail ?? response.statusText);
    throw new ApiError(response.status, `http_${response.status}`, String(detail));
  }
  if (response.status === 204) return undefined as T;
  return schema.parse(await response.json());
}

export function fetchSampleFields(): Promise<Field[]> {
  return request("/v1/demo/fields", {}, z.array(FieldSchema));
}

export function fetchMyFields(): Promise<Field[]> {
  if (!readSession()) return Promise.resolve([]);
  return request("/v1/fields", { auth: "optional" }, z.array(FieldSchema));
}

export function fetchField(id: string): Promise<Field> {
  return request(`/v1/fields/${encodeURIComponent(id)}`, { auth: "optional" }, FieldSchema);
}

export type NewField = {
  name: string;
  boundary: Polygon;
  crop?: string | null;
  irrigation_type?: IrrigationType | null;
};

export function createField(data: NewField): Promise<Field> {
  return request("/v1/fields", { method: "POST", body: JSON.stringify(data), auth: "required" }, FieldSchema);
}

export function fetchFieldPower(
  id: string,
  options: { start?: string; end?: string; parameters?: string[] } = {},
): Promise<PowerDaily> {
  const params = new URLSearchParams();
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  if (options.parameters?.length) params.set("parameters", options.parameters.join(","));
  const query = params.size ? `?${params}` : "";
  return request(`/v1/fields/${encodeURIComponent(id)}/nasa/power/daily${query}`, { auth: "optional" }, PowerDailySchema);
}

export function fetchWaterBalance(id: string, crop: string, season: "last" | "current"): Promise<WaterBalance> {
  const query = new URLSearchParams({ crop, season });
  return request(`/v1/fields/${encodeURIComponent(id)}/water-balance?${query}`, { auth: "optional" }, WaterBalanceSchema);
}

export function fetchRotation(id: string): Promise<Rotation> {
  return request(`/v1/fields/${encodeURIComponent(id)}/rotation`, { auth: "optional" }, RotationSchema);
}

export function compareRotation(id: string, plans: string[][]): Promise<Rotation> {
  return request(
    `/v1/fields/${encodeURIComponent(id)}/rotation/compare`,
    { method: "POST", body: JSON.stringify({ plans }), auth: "optional" },
    RotationSchema,
  );
}
