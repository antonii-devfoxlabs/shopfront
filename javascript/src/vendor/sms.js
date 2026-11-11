// The text message provider's SDK. It keeps what it sends in an outbox.

export class Sms {
  outbox = [];

  send({ to, text }) {
    this.outbox.push({ to, text });
  }
}
