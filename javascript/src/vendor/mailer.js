// The mail provider's SDK. It keeps what it sends in an outbox.

export class Mailer {
  outbox = [];

  send({ from, to, subject, body }) {
    this.outbox.push({ from, to, subject, body });
  }
}
