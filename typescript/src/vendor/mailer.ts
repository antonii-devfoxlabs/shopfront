// The mail provider's SDK. It keeps what it sends in an outbox.

export interface Email {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export class Mailer {
  readonly outbox: Email[] = [];

  send(email: Email): void {
    this.outbox.push({ ...email });
  }
}
