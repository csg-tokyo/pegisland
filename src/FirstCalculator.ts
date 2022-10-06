// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
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
import { union } from './set-operations';
import { EPSILON, SetCalculator } from './SetCalculator';

export class FirstCalculator extends SetCalculator {
  constructor(rules: Map<string, Rule>) {
    super(rules, false);
  }

  visitNonterminal(pe: Nonterminal): void {
    this.set(pe, union(this.get(pe.rule.rhs), new Set([pe])));
  }

  visitTerminal(pe: Terminal): void {
    this.set(pe, new Set([pe]));
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.propagateOperandWithEpsilon(pe);
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.propagateOperand(pe);
  }

  visitOptional(pe: Optional): void {
    this.propagateOperandWithEpsilon(pe);
  }

  visitAnd(pe: And): void {
    this.propagateOperand(pe);
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
    this.propagateOperand(pe);
  }

  visitRewriting(pe: Rewriting): void {
    this.propagateOperand(pe);
  }

  visitColon(pe: Colon): void {
    this.propagate(pe.rhs, pe);
  }

  visitColonNot(pe: ColonNot): void {
    this.propagate(pe.lhs, pe);
  }

  visitLake(pe: Lake): void {
    this.propagateOperandWithEpsilon(pe);
  }

  private propagateOperandWithEpsilon(pe: ZeroOrMore | Optional | Lake): void {
    this.set(pe, union(this.get(pe.operand), new Set([EPSILON])));
  }

  private propagateOperand(pe: OneOrMore | And | Grouping | Rewriting): void {
    this.propagate(pe.operand, pe);
  }
}
