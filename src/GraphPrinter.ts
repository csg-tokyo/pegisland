// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { digraph, NodeModel, toDot } from 'ts-graphviz';
import { Rule } from './Rule';
import { Peg } from './Peg';

export function genDot(peg: Peg, parentsMap: Map<Rule, Set<Rule>>): string {
  const g = digraph('G');
  const nodes = new Map<Rule, NodeModel>();
  [...peg.rules.values()].forEach((rule) => {
    const node = g.createNode(rule.symbol);
    nodes.set(rule, node);
  });
  [...peg.rules.values()].forEach((rule) => {
    if (parentsMap.has(rule)) {
      const parents = [...(parentsMap.get(rule) as Set<Rule>)];
      const to = nodes.get(rule) as NodeModel;
      parents.forEach((parent) => {
        const from = nodes.get(parent) as NodeModel;
        g.createEdge([from, to]);
      });
    }
  });
  return toDot(g);
}
