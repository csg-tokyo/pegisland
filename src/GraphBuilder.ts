// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { BeginningCalculator } from './set/BeginningCalculator';
import {
  IParsingExpression,
  Nonterminal,
  NullParsingExpression,
} from './ParsingExpression';
import { DefaultParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { PostorderExpressionTraverser } from './PostorderExpressionTraverser';
import { Rule } from './Rule';
import { Peg } from './Peg';

export class GraphBuilder extends DefaultParsingExpressionVisitor {
  private parents: Map<Rule, Set<Rule>> = new Map();

  private children: Map<Rule, Set<Rule>> = new Map();

  private rule: Rule = new Rule('dummy', new NullParsingExpression());

  private beginningSet = new Set<IParsingExpression>();

  build(peg: Peg): [Map<Rule, Set<Rule>>, Map<Rule, Set<Rule>>] {
    const beginningSets = new BeginningCalculator(peg.rules, true).calculate();
    const traverser = new PostorderExpressionTraverser(this);
    [...peg.rules.values()].forEach((rule) => {
      this.rule = rule;
      this.beginningSet = beginningSets.get(
        rule.rhs
      ) as Set<IParsingExpression>;
      traverser.traverse(rule.rhs);
    });
    return [this.parents, this.children];
  }

  addParent(rule: Rule, parent: Rule): void {
    if (!this.parents.has(rule)) {
      this.parents.set(rule, new Set());
    }
    const parents = this.parents.get(rule) as Set<Rule>;
    parents.add(parent);

    if (!this.children.has(parent)) {
      this.children.set(parent, new Set());
    }
    const children = this.children.get(parent) as Set<Rule>;
    children.add(rule);
  }

  override visitNonterminal(pe: Nonterminal): void {
    if (this.beginningSet.has(pe)) {
      this.addParent(pe.rule, this.rule);
    }
  }
}
