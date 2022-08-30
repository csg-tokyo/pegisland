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
  Colon,
  ColonNot,
  Lake,
} from './ParsingExpression';
import { difference, union } from './set-operations';
import { strict as assert } from 'assert';

export class AltCalculator extends SetCalculator {
  constructor(
    rules: Map<string, Rule>,
    private beginning: Map<IParsingExpression, Set<IParsingExpression>>,
    private succeed: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    super(rules, false);
  }

  getBeginning(pe: IParsingExpression): Set<IParsingExpression> {
    return this.beginning.get(pe) as Set<IParsingExpression>;
  }

  getSucceed(pe: IParsingExpression): Set<IParsingExpression> {
    return this.succeed.get(pe) as Set<IParsingExpression>;
  }

  visitNonterminal(pe: Nonterminal): void {
    this.set(pe.rule.rhs, union(this.get(pe.rule.rhs), this.get(pe)));
  }

  visitTerminal(pe: Terminal): void {
    assert(true);
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }

  visitOptional(pe: Optional): void {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }

  visitAnd(pe: And): void {
    assert(true);
  }

  visitNot(pe: Not): void {
    assert(true);
  }

  visitSequence(pe: Sequence): void {
    for (const ei of pe.operands) {
      this.set(ei, new Set(this.get(pe)));
      if (!this.getBeginning(ei).has(EPSILON)) {
        break;
      }
    }
  }

  visitOrderedChoice(pe: OrderedChoice): void {
    pe.operands.forEach((ei, i) => {
      this.set(
        ei,
        union(
          this.get(pe),
          difference(
            union(
              new Set([]),
              ...pe.operands
                .filter((ej, j) => j > i)
                .map((ej) => this.getBeginning(ej))
            ),
            new Set([EPSILON])
          )
        )
      );
    });
  }

  visitGrouping(pe: Grouping): void {
    this.set(pe.operand, new Set(this.get(pe)));
  }

  visitRewriting(pe: Rewriting): void {
    this.set(pe.operand, new Set(this.get(pe)));
  }

  visitColon(pe: Colon): void {
    this.set(pe.rhs, new Set(this.get(pe)));
  }

  visitColonNot(pe: ColonNot): void {
    this.set(pe.lhs, new Set(this.get(pe)));
  }

  visitLake(pe: Lake): void {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }
}
