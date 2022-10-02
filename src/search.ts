// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParseTree, Range } from './ParseTree';

function flatten<T>(array: T[][]): T[] {
  return ([] as T[]).concat(...array);
}

interface LineColumn {
  line: number;
  column: number;
}

interface LineColumnRange {
  start: LineColumn;
  end: LineColumn;
}

function isGEQ(a: LineColumn, b: LineColumn): boolean {
  return a.line > b.line || (a.line === b.line && a.column >= b.column);
}

function isLEQ(a: LineColumn, b: LineColumn): boolean {
  return isGEQ(b, a);
}

export function inRange(a: LineColumnRange, b: LineColumnRange): boolean {
  return isGEQ(a.start, b.start) && isLEQ(a.end, b.end);
}

function select<T>(f: (a: T, b: T) => boolean, a: T, b: T): T {
  return f(a, b) ? a : b;
}

export function max(a: LineColumn, b: LineColumn): LineColumn {
  return select(isGEQ, a, b);
}

export function min(a: LineColumn, b: LineColumn): LineColumn {
  return select(isLEQ, a, b);
}

export function searchExpressions(
  node: IParseTree,
  range: LineColumnRange
): IParseTree[] {
  const nodeIsLeaf = node.childNodes.length == 0;
  if (nodeIsLeaf) {
    return inRange(node.range, range) ? [node] : [];
  }
  const nodes = flatten(
    node.childNodes.map((child) => searchExpressions(child, range))
  );
  const nodeSet = new Set(nodes);
  return node.childNodes.every((child) => nodeSet.has(child)) ? [node] : nodes;
}

export type SelectedTree = [IParseTree, SelectedTree[]];

export function search(
  node: IParseTree,
  range: LineColumnRange
): SelectedTree[] {
  const trees = flatten(node.childNodes.map((child) => search(child, range)));
  const isEmpty = node.range.start.equal(node.range.end);
  if (!isEmpty && inRange(node.range, range)) {
    //  if (node instanceof NNonterminal || node instanceof NTerminal) {
    return [[node, trees]];
    //  }
  }
  return trees;
}
