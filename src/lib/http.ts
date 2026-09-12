// Returns a message that is safe to send to the client. In production the raw
// error/exception text (which may contain DB internals, schema details, or
// stack traces) is replaced with a generic fallback; detailed messages are
// only exposed in development/test so failures stay debuggable locally.
export function clientFacingError(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'production') return fallback;
  if (typeof error === 'string' && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
