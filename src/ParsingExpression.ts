// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParsingEnv } from './IParsingEnv';
import { IParseTree } from './ParseTree';
import { Position } from './Position';
import { Rule } from './Rule';

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
  visitNonterminal(_pe: Nonterminal): void {
    // Do nothing
  }
  visitTerminal(_pe: Terminal): void {
    // Do nothing
  }
  visitOrderedChoice(_pe: OrderedChoice): void {
    // Do nothing
  }
  visitSequence(_pe: Sequence): void {
    // Do nothing
  }
  visitAnd(_pe: And): void {
    // Do nothing
  }
  visitColon(_pe: Colon): void {
    // Do nothing
  }
  visitColonNot(_pe: ColonNot): void {
    // Do nothing
  }
  visitGrouping(_pe: Grouping): void {
    // Do nothing
  }
  visitLake(_pe: Lake): void {
    // Do nothing
  }
  visitNot(_pe: Not): void {
    // Do nothing
  }
  visitOneOrMore(_pe: OneOrMore): void {
    // Do nothing
  }
  visitOptional(_pe: Optional): void {
    // Do nothing
  }
  visitRewriting(_pe: Rewriting): void {
    // Do nothing
  }
  visitZeroOrMore(_pe: ZeroOrMore): void {
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

export interface IParsingExpression {
  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T;
}

export class NullParsingExpression implements IParsingExpression {
  parse(_env: IParsingEnv, _pos: Position): [IParseTree, Position] | null {
    return null;
  }
  accept<T, U>(_visitor: IParsingExpressionVisitor<T, U>, _arg?: U): T {
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
