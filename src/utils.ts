// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.

export function measure<T>(f: () => T): [T, number] {
  const start = performance.now();
  const result = f();
  const end = performance.now();
  return [result, end - start];
}
