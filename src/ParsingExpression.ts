// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParseTree, NodeNonterminal, Range } from './ParseTree';
import { Recognizer } from './Recognizer';

export class Position {
  constructor(
    public offset: number,
    public line: number,
    public column: number
  ) {}
  equal(other: Position): boolean {
    return (
      this.offset == other.offset &&
      this.line == other.line &&
      this.column == other.column
    );
  }
}

export interface IParsingExpressionVisitor<T = void, U = void> {
  visitNonterminal(pe: Nonterminal, arg?: U): T;
  visitTerminal(pe: Terminal, arg?: U): T;
  visitZeroOrMore(pe: ZeroOrMore, arg?: U): T;
  visitOneOrMore(pe: OneOrMore, arg?: U): T;
  visitOptional(pe: Optional, arg?: U): T;
  visitAnd(pe: Not, arg?: U): T;
  visitNot(pe: Not, arg?: U): T;
  visitSequence(pe: Sequence, arg?: U): T;
  visitOrderedChoice(pe: OrderedChoice, arg?: U): T;
  visitGrouping(pe: Grouping, arg?: U): T;
  visitRewriting(pe: Rewriting, arg?: U): T;
  visitColon(pe: Colon, arg?: U): T;
  visitColonNot(pe: ColonNot, arg?: U): T;
  visitLake(pe: Lake, arg?: U): T;
}

export class DefaultParsingExpressionVisitor
  implements IParsingExpressionVisitor
{
  visitNonterminal(pe: Nonterminal): void {
    // Do nothing
  }
  visitTerminal(pe: Terminal): void {
    // Do nothing
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    // Do nothing
  }
  visitSequence(pe: Sequence): void {
    // Do nothing
  }
  visitAnd(pe: And): void {
    // Do nothing
  }
  visitColon(pe: Colon): void {
    // Do nothing
  }
  visitColonNot(pe: ColonNot): void {
    // Do nothing
  }
  visitGrouping(pe: Grouping): void {
    // Do nothing
  }
  visitLake(pe: Lake): void {
    // Do nothing
  }
  visitNot(pe: Not): void {
    // Do nothing
  }
  visitOneOrMore(pe: OneOrMore): void {
    // Do nothing
  }
  visitOptional(pe: Optional): void {
    // Do nothing
  }
  visitRewriting(pe: Rewriting): void {
    // Do nothing
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    // Do nothing
  }
}

export class PostorderExpressionTraverser implements IParsingExpressionVisitor {
  visitor: IParsingExpressionVisitor;

  constructor(visitor: IParsingExpressionVisitor) {
    this.visitor = visitor;
  }

  traverse(pe: IParsingExpression): void {
    pe.accept(this);
  }

  visitNonterminal(pe: Nonterminal): void {
    pe.accept(this.visitor);
  }
  visitTerminal(pe: Terminal): void {
    pe.accept(this.visitor);
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitOneOrMore(pe: OneOrMore): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitOptional(pe: Optional): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitAnd(pe: And): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitNot(pe: Not): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitSequence(pe: Sequence): void {
    pe.operands.forEach((operand) => operand.accept(this));
    pe.accept(this.visitor);
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    pe.operands.forEach((operand) => operand.accept(this));
    pe.accept(this.visitor);
  }
  visitGrouping(pe: Grouping): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitRewriting(pe: Rewriting): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitColon(pe: Colon): void {
    pe.lhs.accept(this);
    pe.rhs.accept(this);
    pe.accept(this.visitor);
  }
  visitColonNot(pe: Colon): void {
    pe.lhs.accept(this);
    pe.rhs.accept(this);
    pe.accept(this.visitor);
  }
  visitLake(pe: Lake): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
}

export class Rule {
  constructor(
    public symbol: string,
    public rhs: IParsingExpression,
    public isWater = false
  ) {}
  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    return this.parseWithoutMemo(env, pos);
  }

  parseWithoutMemo(
    env: IParsingEnv,
    pos: Position
  ): [IParseTree, Position] | null {
    env.push();
    const result = env.parse(this.rhs, pos);
    env.pop();
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [
      new NodeNonterminal(this.symbol, new Range(pos, nextIndex), childNode),
      nextIndex,
    ];
  }
}

export interface IParsingEnv {
  s: string;
  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null;
  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null;
  push(): void;
  pop(): void;
  has(name: string): boolean;
  lookup(name: string): string;
  register(name: string, value: string): void;
}

export abstract class BaseParsingEnv implements IParsingEnv {
  recognizer = new Recognizer(this);
  abstract s: string;
  private symbolStack: { [name: string]: string }[] = [];
  push(): void {
    this.symbolStack.push({});
  }
  pop(): void {
    this.symbolStack.pop();
  }
  has(name: string): boolean {
    return name in this.symbolStack[this.symbolStack.length - 1];
  }
  lookup(name: string): string {
    return this.symbolStack[this.symbolStack.length - 1][name];
  }
  register(name: string, value: string): void {
    this.symbolStack[this.symbolStack.length - 1][name] = value;
  }

  abstract parse(
    pe: IParsingExpression,
    pos: Position
  ): [IParseTree, Position] | null;

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    return rule.parse(this, pos);
  }
}

export interface IParsingExpression {
  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T;
}

export class NullParsingExpression implements IParsingExpression {
  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    return null;
  }
  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    throw Error('Should not be called');
    //    return null as T;
  }
}

export class Nonterminal implements IParsingExpression {
  rule: Rule;
  name: string;
  constructor(rule: Rule, name = '') {
    this.rule = rule;
    this.name = name;
  }

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitNonterminal(this, arg);
  }
}

export class Terminal implements IParsingExpression {
  regex: RegExp;
  source: string;
  constructor(pattern: string | RegExp, source: string) {
    if (pattern instanceof RegExp) {
      this.regex = new RegExp(pattern.source, 'smy');
    } else {
      this.regex = new RegExp(pattern, 'smy');
    }
    this.source = source;
  }

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitTerminal(this, arg);
  }
}

export class ZeroOrMore implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitZeroOrMore(this, arg);
  }
}

export class OneOrMore implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitOneOrMore(this, arg);
  }
}

export class Optional implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitOptional(this, arg);
  }
}

export class And implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitAnd(this, arg);
  }
}

export class Not implements IParsingExpression {
  operand: IParsingExpression;
  constructor(operand: IParsingExpression) {
    this.operand = operand;
  }

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitNot(this, arg);
  }
}

export class Colon implements IParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitColon(this, arg);
  }
}

export class ColonNot implements IParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitColonNot(this, arg);
  }
}

export class Sequence implements IParsingExpression {
  constructor(public operands: IParsingExpression[]) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitSequence(this, arg);
  }
}

export class OrderedChoice implements IParsingExpression {
  constructor(public operands: IParsingExpression[]) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitOrderedChoice(this, arg);
  }
}

export class Grouping implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitGrouping(this, arg);
  }
}

export class Rewriting implements IParsingExpression {
  constructor(public operand: IParsingExpression, public spec: string) {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitRewriting(this, arg);
  }
}

export class Lake implements IParsingExpression {
  semantics: IParsingExpression = new NullParsingExpression();
  constructor(public operand: IParsingExpression) {}

  makeSemantics(symbols: Set<IParsingExpression>, waterRules: Rule[]) {
    const operandIsEpsilon =
      this.operand instanceof Sequence && this.operand.operands.length == 0;
    const wildcard = new OrderedChoice([
      ...waterRules.map((rule) => new Nonterminal(rule)),
      new Sequence([
        ...[...symbols].map((symbol) => new Not(symbol)),
        new Terminal(/./, '.'),
      ]),
    ]);
    const allwaysFailExpression = new Sequence([
      new Not(new Terminal(/./, '.')),
      new And(new Terminal(/./, '.')),
    ]);
    this.semantics = new ZeroOrMore(
      new Grouping(
        new OrderedChoice([
          operandIsEpsilon ? allwaysFailExpression : this.operand,
          wildcard,
        ])
      )
    );
    this.operand = this.semantics;
  }

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitLake(this, arg);
  }
}
