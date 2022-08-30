import { BeginningCalculator } from './BeginningCalculator';
import {
  And,
  Rule,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  IParsingExpressionVisitor,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
  NullParsingExpression,
  PostorderExpressionTraverser,
  Lake,
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

export class GraphBuilder implements IParsingExpressionVisitor {
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

  visitNonterminal(pe: Nonterminal): void {
    if (this.beginningSet.has(pe)) {
      this.addParent(pe.rule, this.rule);
    }
  }

  visitTerminal(pe: Terminal): void {
    // Nothing to be done
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    // Nothing to be done
  }
  visitOneOrMore(pe: OneOrMore): void {
    // Nothing to be done
  }
  visitOptional(pe: Optional): void {
    // Nothing to be done
  }
  visitAnd(pe: And): void {
    // Nothing to be done
  }
  visitNot(pe: Not): void {
    // Nothing to be done
  }
  visitSequence(pe: Sequence): void {
    // Nothing to be done
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    // Nothing to be done
  }
  visitGrouping(pe: Grouping): void {
    // Nothing to be done
  }
  visitRewriting(pe: Rewriting): void {
    // Nothing to be done
  }
  visitColon(pe: Colon): void {
    // Nothing to be done
  }
  visitColonNot(pe: ColonNot): void {
    // Nothing to be done
  }
  visitLake(pe: Lake): void {
    // Nothing to be done
  }
}
function pop(S: Set<Rule>) {
  const rule = S.values().next().value as Rule;
  S.delete(rule);
  return rule;
}
