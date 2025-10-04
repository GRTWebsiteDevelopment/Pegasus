import { EmailMessage } from '../types';
import { emailMock } from '../clients/emailMock';

export async function sendEmailNotification(message: EmailMessage): Promise<{ id: string }> {
  return emailMock.sendEmail(message);
}

