export class EdgeFunctionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.name = 'EdgeFunctionError';
    this.status = status;
    this.code = code;
  }
}

export function parseEdgeErrorBody(
  status: number,
  bodyText: string
): EdgeFunctionError {
  const fallbackCode = `HTTP_${status}`;
  if (!bodyText.trim()) {
    return new EdgeFunctionError(status, fallbackCode);
  }

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: unknown;
      code?: unknown;
      message?: unknown;
    };

    const code =
      typeof parsed.error === 'string' && parsed.error.trim()
        ? parsed.error.trim()
        : typeof parsed.code === 'string' && parsed.code.trim()
          ? parsed.code.trim()
          : fallbackCode;

    const message =
      typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim()
        : typeof parsed.error === 'string' && parsed.error.trim()
          ? parsed.error.trim()
          : code;

    return new EdgeFunctionError(status, code, message);
  } catch {
    return new EdgeFunctionError(status, fallbackCode, bodyText);
  }
}
