// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { FirstCalculator } from './FirstCalculator';
import { Colon, ColonNot, Nonterminal, Not } from '../ParsingExpression';
import { Rule } from '../Rule';
import { union } from '../set-operations';
import { EPSILON } from './SetCalculator';

export class BeginningCalculator extends FirstCalculator {
  constructor(rules: Map<string, Rule>, private readonly isSpecial = false) {
    super(rules);
  }

  override visitNonterminal(pe: Nonterminal): void {
    if (this.get(pe.rule.rhs).has(EPSILON)) {
      this.set(pe, new Set([pe, EPSILON]));
    } else {
      this.set(pe, new Set([pe]));
    }
  }

  override visitNot(pe: Not): void {
    if (this.isSpecial) {
      this.set(pe, union(this.get(pe.operand), new Set([EPSILON])));
    } else {
      this.set(pe, new Set([EPSILON]));
    }
  }

  override visitColon(pe: Colon): void {
    if (this.isSpecial) {
      this.set(pe, union(this.get(pe.lhs), this.get(pe.rhs)));
    } else {
      this.set(pe, new Set(this.get(pe.rhs)));
    }
  }

  override visitColonNot(pe: ColonNot): void {
    if (this.isSpecial) {
      this.set(pe, union(this.get(pe.lhs), this.get(pe.rhs)));
    } else {
      this.set(pe, new Set(this.get(pe.lhs)));
    }
  }
}
