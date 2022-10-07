// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { Rule } from './Rule';

export interface IParsingExpression {
  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T;
}

class ParsingExpression implements IParsingExpression {
  readonly #name = `visit${(this as object).constructor.name}`;

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor[this.#name as keyof typeof visitor](this as never, arg);
  }
}

class UnaryOperator extends ParsingExpression {
  constructor(public operand: IParsingExpression) {
    super();
  }
}

class BinaryOperator extends ParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {
    super();
  }
}

class GeneralOperator extends ParsingExpression {
  constructor(public operands: IParsingExpression[]) {
    super();
  }
}

export class NullParsingExpression extends ParsingExpression {
  override accept<T, U>(
    _visitor: IParsingExpressionVisitor<T, U>,
    _arg?: U
  ): T {
    throw Error('Should not be called');
  }
}

export class Nonterminal extends ParsingExpression {
  constructor(public rule: Rule, public name = '') {
    super();
  }
}

export class Terminal extends ParsingExpression {
  regex: RegExp;

  constructor(public pattern: string | RegExp, public source: string) {
    super();
    this.regex =
      pattern instanceof RegExp
        ? new RegExp(pattern.source, 'smy')
        : new RegExp(pattern, 'smy');
  }
}

export class ZeroOrMore extends UnaryOperator {}

export class OneOrMore extends UnaryOperator {}

export class Optional extends UnaryOperator {}

export class And extends UnaryOperator {}

export class Not extends UnaryOperator {}

export class Colon extends BinaryOperator {}

export class ColonNot extends BinaryOperator {}

export class Sequence extends GeneralOperator {}

export class OrderedChoice extends GeneralOperator {}

export class Grouping extends UnaryOperator {}

export class Rewriting extends ParsingExpression {
  constructor(public operand: IParsingExpression, public spec: string) {
    super();
  }
}

export class Lake extends UnaryOperator {
  semantics: IParsingExpression = new NullParsingExpression();

  makeSemantics(symbols: Set<IParsingExpression>, waterRules: Rule[]) {
    const operandIsEpsilon =
      this.operand instanceof Sequence && this.operand.operands.length === 0;
    const wildcard = new OrderedChoice([
      ...waterRules.map((rule) => new Nonterminal(rule)),
      new Sequence([
        ...[...symbols].map((symbol) => new Not(symbol)),
        new Terminal(/./, '.'),
      ]),
    ]);
    const alwaysFailExpression = new Sequence([
      new Not(new Terminal(/./, '.')),
      new And(new Terminal(/./, '.')),
    ]);
    this.semantics = new ZeroOrMore(
      new Grouping(
        new OrderedChoice([
          operandIsEpsilon ? alwaysFailExpression : this.operand,
          wildcard,
        ])
      )
    );
    this.operand = this.semantics;
  }
}
