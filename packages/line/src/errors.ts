// ============================================================
// @sleepy-beds/line — Error types
// ============================================================

export type LineErrorCode =
  | "CONFIG_ERROR" // missing token / target / fetch
  | "API_ERROR" // LINE API returned a non-2xx response
  | "NETWORK_ERROR"; // fetch itself threw

export interface LineErrorOptions {
  code: LineErrorCode;
  message: string;
  status?: number;
  body?: unknown;
  cause?: unknown;
}

/** The single error type thrown by {@link Beds24LineNotifier}. */
export class LineError extends Error {
  readonly code: LineErrorCode;
  readonly status?: number;
  readonly body?: unknown;

  constructor(options: LineErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "LineError";
    this.code = options.code;
    this.status = options.status;
    this.body = options.body;
    Object.setPrototypeOf(this, LineError.prototype);
  }
}

export function isLineError(value: unknown): value is LineError {
  return value instanceof LineError;
}
