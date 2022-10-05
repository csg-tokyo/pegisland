// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  Lake,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rewriting,
  Sequence,
  ZeroOrMore,
} from './ParsingExpression';
import { Rule } from './Rule';
import { difference, union } from './set-operations';
import { EPSILON } from './SetCalculator';
import { TopDownSetCalculator } from './TopDownSetCalculator';
import { getValue } from './utils';

export class AltCalculator extends TopDownSetCalculator {
  constructor(
    rules: Map<string, Rule>,
    beginning: Map<IParsingExpression, Set<IParsingExpression>>,
    private succeed: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    super(rules, beginning);
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.propagateWithSucceed(pe);
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.propagateWithSucceed(pe);
  }

  visitOptional(pe: Optional): void {
    this.propagateWithSucceed(pe);
  }

  visitAnd(_pe: And): void {
    // Do nothing
  }

  visitNot(_pe: Not): void {
    // Do nothing
  }

  visitSequence(pe: Sequence): void {
    for (const ei of pe.operands) {
      this.propagate(pe, ei);
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
    this.propagateWithSucceed(pe);
  }

  private propagateWithSucceed(pe: ZeroOrMore | OneOrMore | Optional | Lake) {
    this.set(pe.operand, union(this.get(pe), this.getSucceed(pe)));
  }

  private getSucceed(pe: IParsingExpression): Set<IParsingExpression> {
    return getValue(this.succeed, pe);
  }
}
