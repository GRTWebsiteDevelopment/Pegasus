export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTimeIso: string;
  endTimeIso: string;
  attendees?: string[];
  metadata?: Record<string, string>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface WebhookPayload {
  eventId: string;
  action: 'created' | 'updated' | 'deleted';
  timestampIso: string;
}

