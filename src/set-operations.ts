// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';

export function union<T>(...sets: Set<T>[]): Set<T> {
  assert(sets.length > 0);
  return sets.reduce((x, y) => new Set([...Array.from(x), ...Array.from(y)]));
}

export function intersection<T>(...sets: Set<T>[]): Set<T> {
  assert(sets.length > 0);
  return sets.reduce((x, y) => new Set(Array.from(x).filter((e) => y.has(e))));
}

export function difference<T>(...sets: Set<T>[]): Set<T> {
  assert(sets.length > 0);
  return sets.reduce((x, y) => new Set(Array.from(x).filter((e) => !y.has(e))));
}

export function areEqualSets<T>(x: Set<T>, y: Set<T>): boolean {
  return x.size === y.size && difference(x, y).size === 0;
}
