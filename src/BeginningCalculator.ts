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
} from './ParsingExpression';
import { union } from './set-operations';

export class BeginningCalculator extends SetCalculator {
  constructor(rules: Map<string, Rule>) {
    super(rules, false);
  }

  visitNonterminal(pe: Nonterminal): void {
    if (this.get(pe.rule.rhs).has(EPSILON)) {
      this.set(pe, new Set([pe, EPSILON]));
    } else {
      this.set(pe, new Set([pe]));
    }
  }

  visitTerminal(pe: Terminal): void {
    this.set(pe, new Set([pe]));
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.set(pe, union(this.get(pe.operand), new Set([EPSILON])));
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.set(pe, new Set(this.get(pe.operand)));
  }

  visitOptional(pe: Optional): void {
    this.set(pe, union(this.get(pe.operand), new Set([EPSILON])));
  }

  visitAnd(pe: And): void {
    this.set(pe, new Set(this.get(pe.operand)));
  }

  visitNot(pe: Not): void {
    this.set(pe, new Set([EPSILON]));
  }

  visitSequence(pe: Sequence): void {
    let newS = new Set<IParsingExpression>([EPSILON]);
    for (const operand of pe.operands) {
      const t = this.get(operand);
      newS = union(newS, t);
      if (!t.has(EPSILON)) {
        newS.delete(EPSILON);
        break;
      }
    }
    this.set(pe, newS);
  }

  visitOrderedChoice(pe: OrderedChoice): void {
    this.set(pe, union(...pe.operands.map((operand) => this.get(operand))));
  }

  visitGrouping(pe: Grouping): void {
    this.set(pe, new Set(this.get(pe.operand)));
  }

  visitRewriting(pe: Rewriting): void {
    this.set(pe, new Set(this.get(pe.operand)));
  }

  visitColon(pe: Colon): void {
    this.set(pe, new Set(this.get(pe.rhs)));
  }

  visitColonNot(pe: ColonNot): void {
    this.set(pe, new Set(this.get(pe.lhs)));
  }
}
