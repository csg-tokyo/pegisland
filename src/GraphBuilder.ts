import { BeginningCalculator } from './BeginningCalculator';
import {
  Rule,
  IParsingExpression,
  Nonterminal,
  NullParsingExpression,
  PostorderExpressionTraverser,
  DefaultParsingExpressionVisitor,
} from './ParsingExpression';
import { Peg } from './Peg';

function sort(peg: Peg, parentsMap: Map<Rule, Set<Rule>>) {
  const childrenMap = new Map<Rule, Set<Rule>>();
  peg.rules.forEach((rule) => {
    childrenMap.set(rule, new Set());
  });
  parentsMap.forEach((parents, rule) => {
    parents.forEach((parent) => {
      const children = childrenMap.get(parent) as Set<Rule>;
      children.add(rule);
    });
  });
  const S = new Set(
    [...peg.rules.values()].filter(
      (rule) => (childrenMap.get(rule) as Set<Rule>).size == 0
    )
  );
  const rules = [];
  while (S.size > 0) {
    const rule = pop(S);
    rules.push(rule);
    parentsMap.get(rule)?.forEach((parent) => {
      const children = childrenMap.get(parent) as Set<Rule>;
      children.delete(rule);
      if (children.size == 0) {
        S.add(parent);
      }
    });
  }
}

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
function pop(S: Set<Rule>) {
  const rule = S.values().next().value as Rule;
  S.delete(rule);
  return rule;
}
