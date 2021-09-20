// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { SetCalculator, EPSILON } from './SetCalculator';
import {
  And,
  Grouping,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  IParsingExpression,
  Rewriting,
  Rule,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { difference, union } from './set-operations';
import { strict as assert } from 'assert';

export class SucceedCalculator extends SetCalculator {
  constructor(
    rules: Map<string, Rule>,
    public beginning: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    super(rules, false);
  }

  getBeginning(pe: IParsingExpression): Set<IParsingExpression> {
    return this.beginning.get(pe) as Set<IParsingExpression>;
  }

  visitNonterminal(pe: Nonterminal): void {
    this.set(pe.rule.rhs, union(this.get(pe.rule.rhs), this.get(pe)));
  }

  visitTerminal(pe: Terminal): void {
    assert(true);
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.set(
      pe.operand,
      union(this.get(pe), difference(this.getBeginning(pe), new Set([EPSILON])))
    );
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.set(
      pe.operand,
      union(this.get(pe), difference(this.getBeginning(pe), new Set([EPSILON])))
    );
  }

  visitOptional(pe: Optional): void {
    this.set(pe.operand, new Set(this.get(pe)));
  }

  visitAnd(pe: And): void {
    assert(true);
  }

  visitNot(pe: Not): void {
    assert(true);
  }

  visitSequence(pe: Sequence): void {
    let succ = new Set(this.get(pe));
    for (const ei of [...pe.operands].reverse()) {
      this.set(ei, succ);
      if (this.getBeginning(ei).has(EPSILON)) {
        succ = union(
          succ,
          difference(this.getBeginning(ei), new Set([EPSILON]))
        );
      } else {
        succ = new Set(this.getBeginning(ei));
      }
    }
  }

  visitOrderedChoice(pe: OrderedChoice): void {
    for (const operand of pe.operands) {
      this.set(operand, new Set(this.get(pe)));
    }
  }

  visitGrouping(pe: Grouping): void {
    this.set(pe.operand, new Set(this.get(pe)));
  }

  visitRewriting(pe: Rewriting): void {
    this.set(pe.operand, new Set(this.get(pe)));
  }
}
