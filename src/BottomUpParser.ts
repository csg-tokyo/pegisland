// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import assert from 'assert';
import lineColumn from 'line-column';
import { BeginningCalculator } from './BeginningCalculator';
import { GraphBuilder } from './GraphBuilder';
import { genDot } from './GraphPrinter';
import { Indexer } from './Indexer';
import { IParseTree } from './ParseTree';
import {
  BaseParsingEnv,
  Rule,
  IParsingExpression,
  Position,
  Terminal,
} from './ParsingExpression';
import { Peg } from './Peg';
import { peToString } from './Printer';
import { PriorityQueue } from './PriorityQueue';

export class BottomupParsingEnv extends BaseParsingEnv {
  private memo: Map<Rule, [IParseTree, Position] | null>[] = [];
  private createHeap;
  private parentsMap: Map<Rule, Set<Rule>>;

  constructor(public s: string, private peg: Peg) {
    super();
    for (let i = 0; i <= s.length; i++) {
      this.memo.push(new Map<Rule, [IParseTree, Position] | null>());
    }

    const [parentsMap, childrenMap] = createParentsMap(this.peg);
    //console.log(genDot(peg, parentsMap));
    this.parentsMap = parentsMap;
    this.createHeap = getHeapCreator(this.peg, childrenMap);
  }

  parseString(s: string, start: string): [IParseTree, Position] | Error {
    const dummy = ' ';
    const finder = lineColumn(s + dummy);
    for (let pos = s.length; pos >= 0; pos--) {
      const [heap, _indexMap] = this.createHeap();
      // console.log('heap was created for ' + pos, heap.size());

      while (!heap.empty()) {
        const rule = heap.pop() as Rule;
        const info = finder.fromIndex(pos);
        assert(info != null);
        const isGrowing = this.grow(
          rule,
          new Position(pos, info.line, info.col)
        );

        /*
        if (isGrowing)
          console.log(
            pos,
            heap.size(),
            peToString(pe) + ' was poped!' + (this.memo[pos].get(pe) != null)
          );
        */

        if (isGrowing) {
          const parents = this.parentsMap.get(rule);
          if (parents != undefined) {
            parents.forEach((parent) => {
              heap.push(parent);
              //console.log(peToString(parent) + ' was pushed!');
            });
          }
        }
      }
    }

    const startRule = this.peg.rules.get(start) as Rule;
    if (!startRule) {
      return Error(`${start} is not a valid nonterminal symbol.`);
    }
    const result = this.parseRule(startRule, new Position(0, 1, 1));
    if (result == null) {
      return Error(`Failed to recognize ${start}`);
    }
    return result;
  }

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    if (!this.memo[pos.offset].has(rule)) {
      //console.log('XXX: ', pos.offset, rule.symbol);
      this.memo[pos.offset].set(rule, null);
    }
    return this.memo[pos.offset].get(rule) as [IParseTree, Position] | null;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    return pe.accept(this.recognizer, pos);
  }

  isGrowing(
    result: [IParseTree, Position] | null,
    oldResult: [IParseTree, Position] | null
  ): boolean {
    if (oldResult == null) {
      // console.log('oldResult is null');
      return result != null;
    } else {
      assert(result != null, "result can't be null onece it was not null");
      const [_tree, pos] = result;
      const [_oldTree, oldPos] = oldResult;
      //console.log(pos.offset, oldPos.offset);
      return pos.offset > oldPos.offset;
    }
  }

  grow(rule: Rule, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(rule);
    //console.log('Grow ' + show(pe));
    if (isFirstEval) {
      this.memo[pos.offset].set(rule, null);
    }
    const result = rule.parse(this, pos);
    const oldResult = this.memo[pos.offset].get(rule) as
      | null
      | [IParseTree, Position];
    if (isFirstEval || this.isGrowing(result, oldResult)) {
      this.memo[pos.offset].set(rule, result);
      //console.log(result);
      return true;
    } else {
      return false;
    }
  }
}

export function getTopLevelExpressions(peg: Peg): IParsingExpression[] {
  return getTopLevelRules(peg).map((rule) => rule.rhs);
}

function getTopLevelRules(peg: Peg) {
  return peg.toplevelRules.length > 0
    ? peg.toplevelRules
    : [peg.rules.values().next().value as Rule];
}

class DFSTraverser {
  visited = new Set<Rule>();
  bottoms = new Set<Rule>();
  constructor(
    private childrenMap: Map<Rule, Set<Rule>>,
    private topLevelRules: Rule[]
  ) {}

  visit(pe: Rule) {
    const children = this.childrenMap.has(pe)
      ? [...(this.childrenMap.get(pe) as Set<Rule>)]
      : [];
    const unvisitedChildren = children.filter(
      (child) => !this.visited.has(child)
    );
    if (unvisitedChildren.length == 0) {
      this.bottoms.add(pe);
    } else {
      unvisitedChildren.forEach((child) => {
        this.visited.add(child);
        this.visit(child);
      });
    }
  }

  traverse() {
    this.topLevelRules.forEach((rule) => {
      this.visited.add(rule);
      this.visit(rule);
    });
  }
}

function getHeapCreator(peg: Peg, childrenMap: Map<Rule, Set<Rule>>) {
  const indexer = new Indexer();
  const [indexMap, terminals] = indexer.build(peg);
  assert(
    peg.toplevelRules.length > 0,
    'One or more top-level rules are needed.'
  );

  const traverser = new DFSTraverser(childrenMap, peg.toplevelRules);
  traverser.traverse();
  const bottoms = traverser.bottoms;

  const b = new BeginningCalculator(peg.rules, true).calculate();
  const beginWithTerminal = (rule: Rule) =>
    [...(b.get(rule.rhs) as Set<IParsingExpression>).values()].filter(
      (pe) => pe instanceof Terminal
    ).length > 0;
  const bottomRules = [...peg.rules.values()].filter(beginWithTerminal);

  /*
  console.log(
    'XXX',
    [...difference(new Set(bottomRules), bottoms)]
      .map((rule) => rule.symbol)
      .join(',')
  );
  console.log(
    'YYY',
    [...difference(bottoms, new Set(bottomRules))]
      .map((rule) => rule.symbol)
      .join(',')
  );
  */
  /*
  console.log(
    'bottoms',
    [...bottomRules].map((rule) => peToString(rule.rhs)).join('\n')
  );
  */
  const cmp = (a: Rule, b: Rule) => {
    return (indexMap.get(a.rhs) as number) - (indexMap.get(b.rhs) as number);
  };
  return (): [PriorityQueue<Rule>, Map<IParsingExpression, number>] => {
    const heap = new PriorityQueue(cmp);
    bottomRules.forEach((rule) => heap.push(rule));
    //bottoms.forEach((pe) => heap.push(pe));

    return [heap, indexMap];
  };
}

function createParentsMap(peg: Peg) {
  const parentsBuilder = new GraphBuilder();
  const parentsMap = parentsBuilder.build(peg);
  return parentsMap;
}

export class BottomUpParser {
  constructor(private peg: Peg) {}

  parse(s: string, start?: string): IParseTree | Error {
    const env = new BottomupParsingEnv(s, this.peg);
    const result = env.parseString(
      s,
      start ? start : this.peg.rules.keys().next().value
    );
    if (result instanceof Error) {
      return result;
    }
    const [tree, _pos] = result;
    return tree;
  }
}
