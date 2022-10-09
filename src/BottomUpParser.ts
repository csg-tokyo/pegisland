// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import lineColumn from 'line-column';
import { BeginningCalculator } from './set/BeginningCalculator';
import { GraphBuilder } from './GraphBuilder';
import { Indexer } from './Indexer';
import { IParseTree } from './ParseTree';
import { IParsingExpression, Terminal } from './ParsingExpression';
import { BaseParsingEnv } from './IParsingEnv';
import { Rule } from './Rule';
import { Position } from './Position';
import { Peg } from './Peg';
import { PriorityQueue } from './PriorityQueue';
import { PikaParsingEnv } from './PikaParser';

export class BottomUpParsingEnv extends BaseParsingEnv<Rule> {
  private readonly createHeap;

  private readonly parentsMap: Map<Rule, Set<Rule>>;

  constructor(s: string, private peg: Peg) {
    super(s);

    const [parentsMap, childrenMap] = createParentsMap(this.peg);
    // console.log(genDot(peg, parentsMap));
    this.parentsMap = parentsMap;
    this.createHeap = getHeapCreator(this.peg, childrenMap);
  }

  parseString(s: string, start: string): [IParseTree, Position] | Error {
    this.fillMemoTable(s);

    const startRule = this.peg.rules.get(start) as Rule;
    if (!startRule) {
      return Error(`${start} is not a valid nonterminal symbol.`);
    }
    const result = this.parseRule(startRule, new Position(0, 1, 1));
    if (result === null) {
      return Error(`Failed to recognize ${start}`);
    }
    return result;
  }

  override parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    if (!this.memo[pos.offset].has(rule)) {
      // console.log('XXX: ', pos.offset, rule.symbol);
      this.memo[pos.offset].set(rule, null);
    }
    return this.memo[pos.offset].get(rule) as [IParseTree, Position] | null;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    return pe.accept(this.recognizer, pos);
  }

  private fillMemoTable(s: string) {
    const dummy = ' ';
    const finder = lineColumn(s + dummy);
    const makePos = (index: number) => {
      const info = finder.fromIndex(index);
      assert(info !== null);
      return new Position(index, info.line, info.col);
    };

    for (let pos = s.length; pos >= 0; pos--) {
      this.fillMemoEntry(makePos, pos);
    }
  }

  private fillMemoEntry(makePos: (index: number) => Position, pos: number) {
    const [heap] = this.createHeap();
    // console.log('heap was created for ' + pos, heap.size());
    while (!heap.empty()) {
      const rule = heap.pop() as Rule;
      const isGrowing = this.grow(rule, makePos(pos));

      /*
      if (isGrowing)
        console.log(
          pos,
          heap.size(),
          peToString(pe) + ' was popped!' + (this.memo[pos].get(pe) !== null)
        );
      */
      if (!isGrowing) continue;
      const parents = this.parentsMap.get(rule);
      if (!parents) continue;
      parents.forEach((parent) => heap.push(parent));
    }
  }

  private grow(rule: Rule, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(rule);
    // console.log('Grow ' + show(pe));
    if (isFirstEval) {
      this.memo[pos.offset].set(rule, null);
    }
    const result = rule.parse(this, pos);
    const oldResult = this.memo[pos.offset].get(rule) as
      | null
      | [IParseTree, Position];
    if (isFirstEval || isGrowing(result, oldResult)) {
      this.memo[pos.offset].set(rule, result);
      // console.log(result);
      return true;
    }
    return false;
  }
}

export function isGrowing(
  result: [IParseTree, Position] | null,
  oldResult: [IParseTree, Position] | null
): boolean {
  if (oldResult === null) {
    // console.log('oldResult is null');
    return result !== null;
  }
  assert(result !== null, "The result can't be null once it was not null");
  const [, pos] = result;
  const [, oldPos] = oldResult;
  // console.log(pos.offset, oldPos.offset);
  return pos.offset > oldPos.offset;
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
  readonly visited = new Set<Rule>();

  readonly bottoms = new Set<Rule>();

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
    if (unvisitedChildren.length === 0) {
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
  const [indexMap] = indexer.build(peg);
  assert(
    peg.toplevelRules.length > 0,
    'One or more top-level rules are needed.'
  );

  const traverser = new DFSTraverser(childrenMap, peg.toplevelRules);
  traverser.traverse();

  const calculator = new BeginningCalculator(peg.rules, true).calculate();
  const beginWithTerminal = (rule: Rule) =>
    [...(calculator.get(rule.rhs) as Set<IParsingExpression>).values()].filter(
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
  const cmp = (a: Rule, b: Rule) =>
    (indexMap.get(a.rhs) as number) - (indexMap.get(b.rhs) as number);
  return (): [PriorityQueue<Rule>, Map<IParsingExpression, number>] => {
    const heap = new PriorityQueue(cmp);
    bottomRules.forEach((rule) => heap.push(rule));
    // bottoms.forEach((pe) => heap.push(pe));

    return [heap, indexMap];
  };
}

function createParentsMap(peg: Peg) {
  const parentsBuilder = new GraphBuilder();
  const parentsMap = parentsBuilder.build(peg);
  return parentsMap;
}

export class BottomUpParserBase {
  constructor(
    private peg: Peg,
    private ParsingEnvCtor: {
      new (s: string, peg: Peg): BottomUpParsingEnv | PikaParsingEnv;
    }
  ) {}

  parse(s: string, start?: string): IParseTree | Error {
    const env = new this.ParsingEnvCtor(s, this.peg);
    const result = env.parseString(
      s,
      start ? start : this.peg.rules.keys().next().value
    );
    if (result instanceof Error) {
      return result;
    }
    const [tree] = result;
    return tree;
  }
}

export class BottomUpParser extends BottomUpParserBase {
  constructor(peg: Peg) {
    super(peg, BottomUpParsingEnv);
  }
}
