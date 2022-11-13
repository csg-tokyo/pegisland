// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
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
import { Peg } from './Peg';
import { Rule } from './Rule';
import { EPSILON } from './set/SetCalculator';

export class BottomUpTraverser
  implements IParsingExpressionVisitor<[Rule, boolean], boolean>
{
  childrenMap = new Map<Rule, Set<Rule>>();

  parentsMap = new Map<Rule, Set<Rule>>();

  indexMap = new Map<Rule, number>();

  visited = new Set<Rule>();

  queue = new Set<Rule>();

  constructor(
    private peg: Peg,
    private beginning: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    this.peg.rules.forEach((rule) => {
      this.childrenMap.set(rule, new Set<Rule>());
      this.parentsMap.set(rule, new Set<Rule>());
    });
  }

  build() {
    this.peg.toplevelRules.forEach((rule) => {
      this.visited.add(rule);
      rule.rhs.accept(this, rule, true);
    });
    while (this.queue.size > 0) {
      const rule = this.queue.values().next().value;
      this.visited.add(rule);
      this.queue.delete(rule);
      rule.rhs.accept(this, rule, true);
    }
    [...this.visited.values()]
      .reverse()
      .forEach((rule, index) => this.indexMap.set(rule, index));

    return {
      childrenMap: this.childrenMap,
      parentsMap: this.parentsMap,
      indexMap: this.indexMap,
    };
  }

  visitNonterminal(
    pe: Nonterminal,
    parent: Rule,
    isEffective: boolean
  ): boolean {
    if (isEffective) {
      (this.childrenMap.get(parent) as Set<Rule>).add(pe.rule);
      (this.parentsMap.get(pe.rule) as Set<Rule>).add(parent);
      if (!this.visited.has(pe.rule)) {
        this.visited.add(pe.rule);
        this.queue.delete(pe.rule);
        pe.rule.rhs.accept(this, pe.rule, true);
      }
    } else if (!this.visited.has(pe.rule)) {
      this.queue.add(pe.rule);
    }

    return (this.beginning.get(pe) as Set<IParsingExpression>).has(EPSILON);
  }

  visitTerminal(pe: Terminal, _parent: Rule, _isEffective: boolean): boolean {
    return ''.match(pe.regex) !== null;
  }

  visitZeroOrMore(pe: ZeroOrMore, parent: Rule, isEffective: boolean): boolean {
    pe.operand.accept(this, parent, isEffective);
    return true;
  }

  visitOneOrMore(pe: OneOrMore, parent: Rule, isEffective: boolean): boolean {
    return pe.operand.accept(this, parent, isEffective);
  }

  visitOptional(pe: Optional, parent: Rule, isEffective: boolean): boolean {
    pe.operand.accept(this, parent, isEffective);
    return true;
  }

  visitAnd(pe: And, parent: Rule, isEffective: boolean): boolean {
    pe.operand.accept(this, parent, isEffective);
    return true;
  }

  visitNot(pe: Not, parent: Rule, isEffective: boolean): boolean {
    pe.operand.accept(this, parent, isEffective);
    return true;
  }

  visitSequence(pe: Sequence, parent: Rule, isEffective: boolean): boolean {
    let isNullable = true;
    for (const operand of pe.operands) {
      if (!operand.accept(this, parent, isEffective && isNullable)) {
        isNullable = false;
      }
    }
    return (isNullable = false);
  }

  visitOrderedChoice(
    pe: OrderedChoice,
    parent: Rule,
    isEffective: boolean
  ): boolean {
    return pe.operands.some((operand) =>
      operand.accept(this, parent, isEffective)
    );
  }

  visitGrouping(pe: Grouping, parent: Rule, isEffective: boolean): boolean {
    return pe.operand.accept(this, parent, isEffective);
  }

  visitRewriting(pe: Rewriting, parent: Rule, isEffective: boolean): boolean {
    return pe.operand.accept(this, parent, isEffective);
  }

  visitColon(pe: Colon, parent: Rule, isEffective: boolean): boolean {
    pe.lhs.accept(this, parent, isEffective);
    return pe.rhs.accept(this, parent, isEffective);
  }

  visitColonNot(pe: ColonNot, parent: Rule, isEffective: boolean): boolean {
    const nullable = pe.lhs.accept(this, parent, isEffective);
    pe.rhs.accept(this, parent, isEffective);
    return nullable;
  }

  visitLake(pe: Lake, parent: Rule, isEffective: boolean): boolean {
    pe.operand.accept(this, parent, isEffective);
    return true;
  }
}
