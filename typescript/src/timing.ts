// A function decorator: it takes a function and gives back a new one.
// The new function takes the same arguments, does one job of its own and
// calls the function it wraps, so neither that function nor its callers
// change. It names nothing of Shopfront's, so it fits any function.

// Gives back a function that calls `call`, timed and logged.
export function timed<Args extends unknown[], Result>(
  name: string,
  call: (...args: Args) => Result,
  log: (line: string) => void,
): (...args: Args) => Result {
  return (...args) => {
    const started = performance.now();
    const answer = call(...args);
    const tookMs = performance.now() - started;
    log(`${name} in ${tookMs.toFixed(0)} ms`);
    return answer;
  };
}
