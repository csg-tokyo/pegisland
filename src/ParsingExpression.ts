// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { IParsingEnv } from './IParsingEnv';
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { IParseTree } from './ParseTree';
import { Position } from './Position';
import { Rule } from './Rule';

export interface IParsingExpression {
  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T;
}

export class NullParsingExpression implements IParsingExpression {
  parse(_env: IParsingEnv, _pos: Position): [IParseTree, Position] | null {
    return null;
  }

  accept<T, U>(_visitor: IParsingExpressionVisitor<T, U>, _arg?: U): T {
    throw Error('Should not be called');
  }
}

export class Nonterminal implements IParsingExpression {
  constructor(public rule: Rule, public name = '') {}

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor[
      `visit${(this as object).constructor.name}` as keyof typeof visitor
    ](this as any, arg);
  }
}

export class Terminal implements IParsingExpression {
  regex: RegExp;

  constructor(public pattern: string | RegExp, public source: string) {
    this.regex =
      pattern instanceof RegExp
        ? new RegExp(pattern.source, 'smy')
        : new RegExp(pattern, 'smy');
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
  constructor(public operand: IParsingExpression) {}

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

  accept<T, U>(visitor: IParsingExpressionVisitor<T, U>, arg?: U): T {
    return visitor.visitLake(this, arg);
  }
}
