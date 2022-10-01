// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  Lake,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { Rule } from './Rule';
import { difference, union } from './set-operations';
import { EPSILON, SetCalculator } from './SetCalculator';

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

  visitTerminal(_pe: Terminal): void {
    assert(true);
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.propagateWithSucceed(pe);
  }

  private propagateWithSucceed(pe: ZeroOrMore) {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.propagateWithSucceed(pe);
  }

  visitOptional(pe: Optional): void {
    this.propagateWithSucceed(pe);
  }

  visitAnd(_pe: And): void {
    assert(true);
  }

  visitNot(_pe: Not): void {
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
                .filter((_ej, j) => j > i)
                .map((ej) => this.getBeginning(ej))
            ),
            new Set([EPSILON])
          )
        )
      );
    });
  }

  visitGrouping(pe: Grouping): void {
    this.propagateToOperand(pe);
  }

  private propagate(pe: IParsingExpression, operand: IParsingExpression) {
    this.set(operand, new Set(this.get(pe)));
  }

  private propagateToOperand(pe: Grouping) {
    this.propagate(pe, pe.operand);
  }

  visitRewriting(pe: Rewriting): void {
    this.propagateToOperand(pe);
  }

  visitColon(pe: Colon): void {
    this.propagate(pe, pe.rhs);
  }

  visitColonNot(pe: ColonNot): void {
    this.propagate(pe, pe.lhs);
  }

  visitLake(pe: Lake): void {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }
}
