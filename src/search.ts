// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParseTree, Range } from './ParseTree';

function flatten<T>(array: T[][]): T[] {
  return ([] as T[]).concat(...array);
}

export function inRange(
  range: Range,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): boolean {
  if (range.start.line < startLine) {
    return false;
  }
  if (range.end.line > endLine) {
    return false;
  }
  if (range.start.line == startLine && range.start.column < startCol) {
    return false;
  }
  if (range.end.line == endLine && range.end.column > endCol) {
    return false;
  }
  return true;
}

export function max(
  startLineX: number,
  startColX: number,
  startLineY: number,
  startColY: number
): [number, number] {
  if (startLineX > startLineY) {
    return [startLineX, startColX];
  } else if (startLineX < startLineY) {
    return [startLineY, startColY];
  }
  return [startLineX, Math.max(startColX, startColY)];
}

export function min(
  startLineX: number,
  startColX: number,
  startLineY: number,
  startColY: number
): [number, number] {
  if (startLineX < startLineY) {
    return [startLineX, startColX];
  } else if (startLineX > startLineY) {
    return [startLineY, startColY];
  }
  return [startLineX, Math.min(startColX, startColY)];
}

export function searchExpressions(
  node: IParseTree,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): IParseTree[] {
  const nodeIsLeaf = node.childNodes.length == 0;
  if (nodeIsLeaf) {
    if (inRange(node.range, startLine, startCol, endLine, endCol)) {
      return [node];
    } else {
      return [];
    }
  }
  const nodes = flatten(
    node.childNodes.map((child) =>
      searchExpressions(child, startLine, startCol, endLine, endCol)
    )
  );
  const nodeSet = new Set(nodes);
  if (node.childNodes.every((child) => nodeSet.has(child))) {
    return [node];
  }
  return nodes;
}

export type SelectedTree = [IParseTree, SelectedTree[]];

export function search(
  node: IParseTree,
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
): SelectedTree[] {
  const trees = flatten(
    node.childNodes.map((child) =>
      search(child, startLine, startCol, endLine, endCol)
    )
  );
  const isEmpty = node.range.start.equal(node.range.end);
  if (!isEmpty && inRange(node.range, startLine, startCol, endLine, endCol)) {
    //  if (node instanceof NNonterminal || node instanceof NTerminal) {
    return [[node, trees]];
    //  }
  }
  return trees;
}
