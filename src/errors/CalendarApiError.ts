export class CalendarApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly endpoint?: string;

  constructor(message: string, options: { status: number; code?: string; details?: unknown; endpoint?: string }) {
    super(message);
    this.name = 'CalendarApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.endpoint = options.endpoint;
  }
}

export default CalendarApiError;

