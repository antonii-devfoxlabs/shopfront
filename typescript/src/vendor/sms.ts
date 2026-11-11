// The text message provider's SDK. It keeps what it sends in an outbox.

export type TextMessage = {
  to: string;
  text: string;
};

export class Sms {
  readonly outbox: TextMessage[] = [];

  send(message: TextMessage): void {
    this.outbox.push({ ...message });
  }
}
