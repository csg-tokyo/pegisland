// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import {
  And,
  IParsingExpression,
  Nonterminal,
  Not,
  NullParsingExpression,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rule,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { SimpleTree } from './PegParser';

export class InitialPegBuilder {
  rules = new Map<string, Rule>();

  public build(peg: { [name: string]: SimpleTree }): Map<string, Rule> {
    this.rules = new Map<string, Rule>();
    for (const key in peg) {
      this.rules.set(key, new Rule(key, new NullParsingExpression()));
    }
    for (const key in peg) {
      const rule = this.rules.get(key) as Rule;
      rule.rhs = this.compileExpression(peg[key]);
    }
    return this.rules;
  }

  compileExpression(expression: SimpleTree): IParsingExpression {
    if (typeof expression == 'string') {
      const nonterminal = expression;
      assert(this.rules.has(nonterminal));
      return new Nonterminal(this.rules.get(nonterminal) as Rule);
    } else {
      if (expression[0] == 'terminal') {
        const pattern = expression[1] as RegExp | string;
        return new Terminal(
          pattern,
          pattern instanceof RegExp ? `r"${pattern.source}"` : `"${pattern}"`
        );
      } else {
        const operator = expression[0];
        const operands = expression
          .slice(1)
          .map((subexp) => this.compileExpression(subexp as SimpleTree));
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
  }
}
