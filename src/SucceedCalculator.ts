// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
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

export class SucceedCalculator extends TopDownSetCalculator {
  constructor(
    rules: Map<string, Rule>,
    beginning: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    super(rules, beginning);
  }

  getBeginning(pe: IParsingExpression): Set<IParsingExpression> {
    return getValue(this.beginning, pe);
  }

  private propagateWithBeginning(pe: ZeroOrMore | OneOrMore): void {
    this.set(
      pe.operand,
      union(this.get(pe), difference(this.getBeginning(pe), new Set([EPSILON])))
    );
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.propagateWithBeginning(pe);
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.propagateWithBeginning(pe);
  }

  visitOptional(pe: Optional): void {
    this.propagateToOperand(pe);
  }

  visitAnd(_pe: And): void {
    assert(true);
  }

  visitNot(_pe: Not): void {
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
    this.propagateToOperand(pe);
  }
}
