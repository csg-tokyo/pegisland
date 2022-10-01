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
