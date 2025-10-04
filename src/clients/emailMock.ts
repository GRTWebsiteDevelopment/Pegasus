import { EmailMessage } from '../types';

const sent: EmailMessage[] = [];

export const emailMock = {
  async sendEmail(message: EmailMessage): Promise<{ id: string }> {
    sent.push(message);
    return { id: `${sent.length}` };
  },

  getSent(): EmailMessage[] {
    return [...sent];
  },

  clear(): void {
    sent.length = 0;
  },
};

export type EmailMock = typeof emailMock;

