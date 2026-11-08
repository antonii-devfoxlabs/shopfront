// The analytics provider's SDK. It keeps the events it is sent.

export type EventProperties = Record<string, string | number>;

export class Analytics {
  readonly events: [string, EventProperties][] = [];

  track(event: string, properties: EventProperties): void {
    this.events.push([event, properties]);
  }
}
