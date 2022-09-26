// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { digraph, INode, toDot } from 'ts-graphviz';
import { Rule } from './ParsingExpression';
import { Peg } from './Peg';

export function genDot(peg: Peg, parentsMap: Map<Rule, Set<Rule>>): string {
  const g = digraph('G');
  const nodes = new Map<Rule, INode>();
  [...peg.rules.values()].forEach((rule) => {
    const node = g.createNode(rule.symbol);
    nodes.set(rule, node);
  });
  [...peg.rules.values()].forEach((rule) => {
    if (parentsMap.has(rule)) {
      const parents = [...(parentsMap.get(rule) as Set<Rule>)];
      const to = nodes.get(rule) as INode;
      parents.forEach((parent) => {
        const from = nodes.get(parent) as INode;
        g.createEdge([from, to]);
      });
    }
  });
  return toDot(g);
}
