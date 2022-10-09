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
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { Rule } from './Rule';
import { Nonterminals, SimpleTree } from './PegParser';

export class InitialPegBuilder {
  rules = new Map<string, Rule>();

  public build(peg: { [name: string]: SimpleTree }): Map<string, Rule> {
    this.rules = new Map();
    Object.keys(peg).forEach((key) =>
      this.rules.set(key, new Rule(key, new NullParsingExpression()))
    );
    Object.keys(peg).forEach((key) => {
      const rule = this.rules.get(key) as Rule;
      rule.rhs = this.compileExpression(peg[key as Nonterminals]);
    });
    return this.rules;
  }

  private compileExpression(expression: SimpleTree): IParsingExpression {
    if (typeof expression === 'string') {
      return this.compileNonterminal(expression);
    }
    if (expression[0] === 'terminal') {
      return this.compileTerminal(expression);
    }
    return this.compileOperator(expression);
  }

  private compileOperator(
    expression:
      | ['' | '/', ...SimpleTree[]]
      | ['*' | '+' | '?' | '!' | '&', SimpleTree]
  ) {
    const [operator, ...subexpList] = expression;
    const operands = subexpList.map((subexp) => this.compileExpression(subexp));
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

  private compileTerminal(expression: ['terminal', string | RegExp]) {
    const [, pattern] = expression;
    return new Terminal(
      pattern,
      pattern instanceof RegExp ? `r"${pattern.source}"` : `"${pattern}"`
    );
  }

  private compileNonterminal(expression: string) {
    const nonterminal = expression;
    assert(this.rules.has(nonterminal));
    return new Nonterminal(this.rules.get(nonterminal) as Rule);
  }
}
