// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { Rule } from './Rule';

export interface IParsingExpression {
  accept<ArgsType extends Array<unknown> = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

abstract class UnaryOperator implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  abstract accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

abstract class BinaryOperator implements IParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {}

  abstract accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

abstract class GeneralOperator implements IParsingExpression {
  constructor(public operands: IParsingExpression[]) {}

  abstract accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType;
}

export class NullParsingExpression implements IParsingExpression {
  accept<ArgsType extends Array<unknown>, ReturnType>(
    _visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ..._arg: ArgsType
  ): ReturnType {
    throw Error('Should not be called');
  }
}

export class Nonterminal implements IParsingExpression {
  constructor(public rule: Rule, public name = '') {}

  accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitNonterminal(this, ...arg);
  }
}

export class Terminal implements IParsingExpression {
  regex: RegExp;

  constructor(public pattern: RegExp, public source: string) {
    this.regex = new RegExp(pattern.source, 'smy');
  }

  accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitTerminal(this, ...arg);
  }
}

export class ZeroOrMore extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitZeroOrMore(this, ...arg);
  }
}

export class OneOrMore extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOneOrMore(this, ...arg);
  }
}

export class Optional extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOptional(this, ...arg);
  }
}

export class And extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitAnd(this, ...arg);
  }
}

export class Not extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitNot(this, ...arg);
  }
}

export class Colon extends BinaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitColon(this, ...arg);
  }
}

export class ColonNot extends BinaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitColonNot(this, ...arg);
  }
}

export class Sequence extends GeneralOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitSequence(this, ...arg);
  }
}

export class OrderedChoice extends GeneralOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitOrderedChoice(this, ...arg);
  }
}

export class Grouping extends UnaryOperator {
  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitGrouping(this, ...arg);
  }
}

export class Rewriting implements IParsingExpression {
  constructor(public operand: IParsingExpression, public spec: string) {}

  accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitRewriting(this, ...arg);
  }
}

export class Lake extends UnaryOperator {
  readonly originalOperand;

  constructor(operand: IParsingExpression) {
    super(operand);
    this.originalOperand = operand;
  }

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
    this.operand = new ZeroOrMore(
      new Grouping(
        new OrderedChoice([
          operandIsEpsilon ? alwaysFailExpression : this.operand,
          wildcard,
        ])
      )
    );
  }

  override accept<ArgsType extends unknown[] = [], ReturnType = void>(
    visitor: IParsingExpressionVisitor<ArgsType, ReturnType>,
    ...arg: ArgsType
  ): ReturnType {
    return visitor.visitLake(this, ...arg);
  }
}
