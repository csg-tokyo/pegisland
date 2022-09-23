import { Rule } from '../ParsingExpression';
import { Peg } from '../Peg';

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
function pop(S: Set<Rule>) {
  const rule = S.values().next().value as Rule;
  S.delete(rule);
  return rule;
}
