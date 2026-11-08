// The analytics provider's SDK. It keeps the events it is sent.

export class Analytics {
  events = [];

  track(event, properties) {
    this.events.push([event, properties]);
  }
}
