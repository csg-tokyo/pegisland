// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import Heap from 'heap';

export class PriorityQueue<T> {
  heap;
  set = new Set<T>();

  constructor(cmp: (a: T, b: T) => number) {
    this.heap = new Heap<T>(cmp);
  }

  empty() {
    return this.heap.empty();
  }

  push(value: T) {
    if (!this.set.has(value)) {
      this.set.add(value);
      this.heap.push(value);
    }
  }

  pop() {
    const value = this.heap.pop();
    if (value != undefined) {
      this.set.delete(value);
    }
    return value;
  }
}
