// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import {
  IParsingExpression,
  Terminal,
  ZeroOrMore,
  OneOrMore,
  Optional,
  And,
  Not,
  Sequence,
  OrderedChoice,
  Rule,
  NullParsingExpression,
  Nonterminal,
} from './ParsingExpression';

export type SimpleTree = string | RegExp | SimpleTree[];

export class InitialPegBuilder {
  rules = new Map<string, Rule>();

  public build(peg: { [name: string]: SimpleTree }): void {
    this.rules = new Map<string, Rule>();
    for (const key in peg) {
      this.rules.set(key, new Rule(key, new NullParsingExpression()));
    }
    for (const key in peg) {
      const rule = this.rules.get(key) as Rule;
      rule.rhs = this.compileExpression(peg[key]);
    }
  }

  compileExpression(expression: SimpleTree): IParsingExpression {
    if (typeof expression == 'string') {
      const nonterminal = expression;
      assert(this.rules.has(nonterminal));
      return new Nonterminal(this.rules.get(nonterminal) as Rule);
    } else if (Array.isArray(expression)) {
      if (expression[0] == 'terminal') {
        return new Terminal(expression[1] as RegExp | string, '<invalid>');
      } else {
        const operator = expression[0];
        const operands = expression
          .slice(1)
          .map((subexp) => this.compileExpression(subexp));
        switch (operator) {
          case '*':
            return new ZeroOrMore(operands[0]);
          case '+':
            return new OneOrMore(operands[0]);
          case '?':
            return new Optional(operands[0]);
          case '&':
            return new And(operands[0]);
          case '!':
            return new Not(operands[0]);
          case '':
            return new Sequence(operands);
          case '/':
            return new OrderedChoice(operands);
        }
      }
    }
    return new NullParsingExpression();
  }
}
