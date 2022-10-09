// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { Lake } from './ParsingExpression';
import { Position } from './Position';

export class Range {
  constructor(public readonly start: Position, public readonly end: Position) {}
}

export interface IParseTree {
  readonly range: Range;
  readonly childNodes: IParseTree[];
  parentNode: IParseTree;
}

class ParseTree implements IParseTree {
  static #seq = 0;

  readonly id = ParseTree.#getId();

  parentNode: IParseTree = this;

  constructor(public childNodes: IParseTree[], public range: Range) {
    childNodes.forEach((n) => (n.parentNode = this));
  }

  static #getId() {
    return ParseTree.#seq++;
  }
}

export class NodeTerminal extends ParseTree {
  constructor(range: Range, public pattern: RegExp, public text: string) {
    super([], range);
  }
}

export class NodeNonterminal extends ParseTree {
  constructor(public symbol: string, range: Range, childNode: IParseTree) {
    super([childNode], range);
  }
}

export class NodeZeroOrMore extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }
}

export class NodeOneOrMore extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }
}

export class NodeOptional extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }
}

export class NodeAnd extends ParseTree {
  constructor(range: Range, childNode: IParseTree) {
    super([childNode], range);
  }
}

export class NodeNot extends ParseTree {
  constructor(range: Range) {
    super([], range);
  }
}

export class NodeSequence extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }
}

export class NodeOrderedChoice extends ParseTree {
  constructor(range: Range, childNode: IParseTree, public index: number) {
    super([childNode], range);
  }
}

export class NodeGrouping extends ParseTree {
  constructor(range: Range, childNode: IParseTree) {
    super([childNode], range);
  }
}

export class NodeLake extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[], public pe: Lake) {
    super(childNodes, range);
  }
}

declare class Rewriting {}

export class NodeRewriting extends ParseTree {
  constructor(range: Range, childNode: IParseTree, public spec: Rewriting) {
    super([childNode], range);
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
