export function measure<T>(f: () => T): [T, number] {
  const start = process.hrtime.bigint();
  const result = f();
  const end = process.hrtime.bigint();
  return [result, Number(end - start)];
}
