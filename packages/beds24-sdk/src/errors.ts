// ============================================================
// beds24-sdk — Error types
// ============================================================

/**
 * Stable, machine-readable error codes thrown by the SDK.
 * Switch on `error.code` rather than matching message strings.
 */
export type Beds24ErrorCode =
  | "AUTH_ERROR" // missing credentials, token refresh failed, or 401 after retry
  | "RATE_LIMIT" // 429 Too Many Requests
  | "NOT_FOUND" // 404
  | "VALIDATION_ERROR" // 400 / Beds24 rejected the request payload
  | "API_ERROR" // other non-2xx responses from Beds24
  | "PARSE_ERROR" // response body was not valid JSON
  | "NETWORK_ERROR"; // fetch itself threw (DNS, TLS, offline, timeout)

export interface Beds24ErrorOptions {
  code: Beds24ErrorCode;
  message: string;
  /** HTTP status code, when the error originated from a response. */
  status?: number;
  /** Raw response body (parsed JSON or text), for debugging. */
  body?: unknown;
  /** The underlying error, when wrapping a thrown exception. */
  cause?: unknown;
}

/**
 * The single error type thrown by every {@link Beds24Client} method.
 *
 * @example
 * ```ts
 * try {
 *   await client.getProperties();
 * } catch (err) {
 *   if (err instanceof Beds24Error && err.code === "AUTH_ERROR") {
 *     // refresh token is invalid — re-authenticate
 *   }
 * }
 * ```
 */
export class Beds24Error extends Error {
  readonly code: Beds24ErrorCode;
  readonly status?: number;
  readonly body?: unknown;

  constructor(options: Beds24ErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "Beds24Error";
    this.code = options.code;
    this.status = options.status;
    this.body = options.body;
    // Restore prototype chain for instanceof across transpile targets.
    Object.setPrototypeOf(this, Beds24Error.prototype);
  }

  /** Map an HTTP status code to the most specific error code. */
  static codeFromStatus(status: number): Beds24ErrorCode {
    if (status === 401 || status === 403) return "AUTH_ERROR";
    if (status === 404) return "NOT_FOUND";
    if (status === 429) return "RATE_LIMIT";
    if (status === 400 || status === 422) return "VALIDATION_ERROR";
    return "API_ERROR";
  }
}

/** Type guard for narrowing unknown caught values. */
export function isBeds24Error(value: unknown): value is Beds24Error {
  return value instanceof Beds24Error;
}
