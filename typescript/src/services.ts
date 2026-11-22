// Where every part of the store finds what it shares, by name. main
// registers each service once; a part gets it with get(name).

export class UnknownServiceError extends Error {
  override name = 'UnknownServiceError';
}

const services = new Map<string, unknown>();

// Keep a service under its name; the same name again replaces it.
export function register(name: string, service: unknown): void {
  services.set(name, service);
}

// The service registered under this name, as the type the caller names.
export function get<T>(name: string): T {
  const service = services.get(name);
  if (service === undefined) throw new UnknownServiceError(name);
  return service as T;
}

// For tests only: forget every service.
export function reset(): void {
  services.clear();
}
