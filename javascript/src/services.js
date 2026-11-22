// Where every part of the store finds what it shares, by name. main
// registers each service once; a part gets it with get(name).

export class UnknownServiceError extends Error {
  name = 'UnknownServiceError';
}

const services = new Map();

// Keep a service under its name; the same name again replaces it.
export function register(name, service) {
  services.set(name, service);
}

// The service registered under this name.
export function get(name) {
  const service = services.get(name);
  if (service === undefined) throw new UnknownServiceError(name);
  return service;
}

// For tests only: forget every service.
export function reset() {
  services.clear();
}
