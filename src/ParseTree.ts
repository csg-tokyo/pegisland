// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { Position } from './ParsingExpression';

export class Range {
  constructor(public start: Position, public end: Position) {}
  equal(other: Range): boolean {
    return this.start.equal(other.start) && this.end.equal(other.end);
  }
}

let seq = 0;

function getSeq() {
  return seq++;
}

export function printTree(tree: IParseTree, level = 0): void {
  if (tree instanceof NodeNonterminal) {
    console.log(level, tree.symbol);
  }
  tree.childNodes.forEach((x) => {
    printTree(x, level + 1);
  });
}

export interface IParseTree {
  id: number;
  range: Range;
  childNodes: IParseTree[];
  parentNode: IParseTree;
}

export class NodeTerminal implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[] = [];
  parentNode: IParseTree = this;

  constructor(
    public range: Range,
    public pattern: RegExp,
    public text: string
  ) {}
}

export class NodeNonterminal implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(
    public symbol: string,
    public range: Range,
    childNode: IParseTree
  ) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

export class NodeZeroOrMore implements IParseTree {
  id = getSeq();
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOneOrMore implements IParseTree {
  id = getSeq();
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOptional implements IParseTree {
  id = getSeq();
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeAnd implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(public range: Range, childNode: IParseTree) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

export class NodeNot implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[] = [];
  parentNode: IParseTree = this;
  constructor(public range: Range) {}
}

export class NodeSequence implements IParseTree {
  id = getSeq();
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOrderedChoice implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(
    public range: Range,
    childNode: IParseTree,
    public index: number
  ) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

export class NodeGrouping implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(public range: Range, childNode: IParseTree) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

declare class Rewriting {}

export class NodeRewriting implements IParseTree {
  id = getSeq();
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(
    public range: Range,
    childNode: IParseTree,
    public spec: Rewriting
  ) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}
