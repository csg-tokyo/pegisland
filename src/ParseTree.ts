// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { Lake } from './ParsingExpression';
import { Position } from './Position';

export class Range {
  constructor(public start: Position, public end: Position) {}
}

export interface IParseTree {
  range: Range;
  childNodes: IParseTree[];
  parentNode: IParseTree;
}

export class NodeTerminal implements IParseTree {
  childNodes: IParseTree[] = [];
  parentNode: IParseTree = this;

  constructor(
    public range: Range,
    public pattern: RegExp,
    public text: string
  ) {}
}

export class NodeNonterminal implements IParseTree {
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
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOneOrMore implements IParseTree {
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOptional implements IParseTree {
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeAnd implements IParseTree {
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(public range: Range, childNode: IParseTree) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

export class NodeNot implements IParseTree {
  childNodes: IParseTree[] = [];
  parentNode: IParseTree = this;
  constructor(public range: Range) {}
}

export class NodeSequence implements IParseTree {
  parentNode: IParseTree = this;
  constructor(public range: Range, public childNodes: IParseTree[]) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

export class NodeOrderedChoice implements IParseTree {
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
  childNodes: IParseTree[];
  parentNode: IParseTree = this;
  constructor(public range: Range, childNode: IParseTree) {
    this.childNodes = [childNode];
    childNode.parentNode = this;
  }
}

export class NodeLake implements IParseTree {
  parentNode: IParseTree = this;
  constructor(
    public range: Range,
    public childNodes: IParseTree[],
    public pe: Lake
  ) {
    childNodes.forEach((n) => (n.parentNode = this));
  }
}

declare class Rewriting {}

export class NodeRewriting implements IParseTree {
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

export function traverseNonterminals(
  parseTree: IParseTree,
  func: (node: NodeNonterminal) => void
): void {
  traverseTree(parseTree, (node) => {
    if (node instanceof NodeNonterminal) {
      func(node);
    }
  });
}

function traverseTree(parseTree: IParseTree, func: (node: IParseTree) => void) {
  parseTree.childNodes.forEach((node) => {
    func(node);
    traverseTree(node, func);
  });
}
