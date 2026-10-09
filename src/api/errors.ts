export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly payload?: Record<string, string[]>;

  constructor(status: number, type: string, message: string, payload?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.payload = payload;
  }
}

type ErrorBody = {
  error?: {
    type?: string;
    message?: string;
    payload?: Record<string, string[]>;
  };
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  let body: ErrorBody | null = null;
  try {
    const text = await response.text();
    body = text ? (JSON.parse(text) as ErrorBody) : null;
  } catch {
    body = null;
  }

  const info = body?.error;
  return new ApiError(
    response.status,
    info?.type ?? 'BadRequestException',
    info?.message || response.statusText || 'Request failed',
    info?.payload,
  );
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (!isApiError(error)) return undefined;
  return error.payload?.[field]?.[0];
}

export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Не вдалося виконати запит.';
}
