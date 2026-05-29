export function exitWith(code: number, message?: string): never {
  if (message) process.stderr.write(`${message}\n`);
  process.exit(code);
}

export function parseList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
