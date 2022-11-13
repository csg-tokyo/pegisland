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
  accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

abstract class ParseTree implements IParseTree {
  static #seq = 0;

  readonly id = ParseTree.#getId();

  parentNode: IParseTree = this;

  constructor(public childNodes: IParseTree[], public range: Range) {
    childNodes.forEach((n) => (n.parentNode = this));
  }

  static #getId() {
    return ParseTree.#seq++;
  }

  abstract accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

export interface IParseTreeVisitor<
  ArgsType extends Array<unknown> = [],
  ReturnType = void
> {
  visitNonterminal(node: NodeNonterminal, ...args: ArgsType): ReturnType;
  visitTerminal(node: NodeTerminal, ...args: ArgsType): ReturnType;
  visitLake(node: NodeLake, ...args: ArgsType): ReturnType;
  visitZeroOrMore(node: NodeZeroOrMore, ...args: ArgsType): ReturnType;
  visitOneOrMore(node: NodeOneOrMore, ...args: ArgsType): ReturnType;
  visitOptional(node: NodeOptional, ...args: ArgsType): ReturnType;
  visitOrderedChoice(node: NodeOrderedChoice, ...arg: ArgsType): ReturnType;
  visitSequence(node: NodeSequence, ...args: ArgsType): ReturnType;
  visitAnd(node: NodeAnd, ...args: ArgsType): ReturnType;
  visitNot(node: NodeNot, ...args: ArgsType): ReturnType;
  visitGrouping(node: NodeGrouping, ...args: ArgsType): ReturnType;
  visitRewriting(node: NodeRewriting, ...args: ArgsType): ReturnType;
}

export class DefaultParseTreeVisitor implements IParseTreeVisitor {
  visitNonterminal(_node: NodeNonterminal): void {
    // Do nothing.
  }

  visitTerminal(_node: NodeTerminal): void {
    // Do nothing.
  }

  visitLake(_node: NodeLake): void {
    // Do nothing.
  }

  visitZeroOrMore(_node: NodeZeroOrMore): void {
    // Do nothing.
  }

  visitOneOrMore(_node: NodeOneOrMore): void {
    // Do nothing.
  }

  visitOptional(_node: NodeOptional): void {
    // Do nothing.
  }

  visitOrderedChoice(_node: NodeOrderedChoice): void {
    // Do nothing.
  }

  visitSequence(_node: NodeSequence): void {
    // Do nothing.
  }

  visitAnd(_node: NodeAnd): void {
    // Do nothing.
  }

  visitNot(_node: NodeNot): void {
    // Do nothing.
  }

  visitGrouping(_node: NodeGrouping): void {
    // Do nothing.
  }

  visitRewriting(_node: NodeRewriting): void {
    // Do nothing.
  }
}

export class NodeTerminal extends ParseTree {
  constructor(range: Range, public pattern: RegExp, public text: string) {
    super([], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitTerminal(this, ...arg);
  }
}

export class NodeNonterminal extends ParseTree {
  constructor(public symbol: string, range: Range, childNode: IParseTree) {
    super([childNode], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitNonterminal(this, ...arg);
  }
}

export class NodeZeroOrMore extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitZeroOrMore(this, ...arg);
  }
}

export class NodeOneOrMore extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOneOrMore(this, ...arg);
  }
}

export class NodeOptional extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOptional(this, ...arg);
  }
}

export class NodeAnd extends ParseTree {
  constructor(range: Range, childNode: IParseTree) {
    super([childNode], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitAnd(this, ...arg);
  }
}

export class NodeNot extends ParseTree {
  constructor(range: Range) {
    super([], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitNot(this, ...arg);
  }
}

export class NodeSequence extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[]) {
    super(childNodes, range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitSequence(this, ...arg);
  }
}

export class NodeOrderedChoice extends ParseTree {
  constructor(range: Range, childNode: IParseTree, public index: number) {
    super([childNode], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOrderedChoice(this, ...arg);
  }
}

export class NodeGrouping extends ParseTree {
  constructor(range: Range, childNode: IParseTree) {
    super([childNode], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitGrouping(this, ...arg);
  }
}

export class NodeLake extends ParseTree {
  constructor(range: Range, childNodes: IParseTree[], public pe: Lake) {
    super(childNodes, range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitLake(this, ...arg);
  }
}

declare class Rewriting {}

export class NodeRewriting extends ParseTree {
  constructor(range: Range, childNode: IParseTree, public spec: Rewriting) {
    super([childNode], range);
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParseTreeVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitRewriting(this, ...arg);
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
