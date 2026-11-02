import type { PodProvider } from "./types";

// A print shop API error. `retryable` is true for timeouts, rate limits and 5xx
// responses; other 4xx responses mean the request itself must be fixed.
export class PodApiError extends Error {
  constructor(
    readonly provider: PodProvider,
    readonly status: number | null,
    message: string,
    readonly retryable: boolean,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PodApiError";
  }
}

export const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

// Never echo credentials or full customer data into logs or the admin UI.
const SECRET_KEYS = /authorization|api[-_]?key|token|secret|password|email|phone|address|zip|postcode|postal/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return typeof value === "string" ? value.slice(0, 500) : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, SECRET_KEYS.test(key) ? "[redacted]" : redact(item, depth + 1)]));
}

// A readable error message from the provider's JSON body (each shop uses its own shape).
function providerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return typeof body === "string" && body ? body.slice(0, 300) : null;
  const value = body as Record<string, unknown>;
  const nested = value.error && typeof value.error === "object" ? (value.error as Record<string, unknown>) : null;
  const candidates = [value.message, nested?.message, value.error, value.result, value.statusText, value.outcome];
  const message = candidates.find((item) => typeof item === "string" && item.trim());
  const details = value.failures ?? value.errors ?? value.data ?? value.issues;
  return [message, details && typeof details === "object" ? JSON.stringify(redact(details)).slice(0, 300) : null].filter(Boolean).join(" — ") || null;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// JSON request with a timeout. Throws PodApiError for transport failures and
// non-2xx responses; returns the parsed body otherwise.
export async function podRequest<T>(provider: PodProvider, url: string, init: RequestInit & { timeoutMs?: number; fetchImpl?: FetchLike } = {}): Promise<{ status: number; body: T }> {
  const { timeoutMs = 20_000, fetchImpl = fetch, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(url, { ...rest, signal: controller.signal, cache: "no-store" });
  } catch (reason) {
    const aborted = reason instanceof Error && reason.name === "AbortError";
    throw new PodApiError(provider, null, aborted ? `${provider} did not answer within ${Math.round(timeoutMs / 1000)} s` : `${provider} could not be reached`, true);
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep the text */ }
  if (!response.ok) {
    throw new PodApiError(provider, response.status, `${provider} answered HTTP ${response.status}${providerMessage(body) ? `: ${providerMessage(body)}` : ""}`, isRetryableStatus(response.status), redact(body));
  }
  return { status: response.status, body: body as T };
}
