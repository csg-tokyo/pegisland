// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import lineColumn from 'line-column';
import { BottomUpTraverser } from './BottomUpTraverser';
import { genDot } from './GraphPrinter';
import { BaseParsingEnv } from './IParsingEnv';
import { IParseTree } from './ParseTree';
import { IParsingExpression, Terminal } from './ParsingExpression';
import { Peg } from './Peg';
import { PikaParsingEnv } from './PikaParser';
import { Position } from './Position';
import { PriorityQueue } from './PriorityQueue';
import { Rule } from './Rule';
import { BeginningCalculator } from './set/BeginningCalculator';
import * as fs from 'fs';

export class BottomUpParsingEnv extends BaseParsingEnv<Rule> {
  private readonly createHeap;

  private readonly parentsMap: Map<Rule, Set<Rule>>;

  constructor(s: string, private peg: Peg) {
    super(s);
    const beginning = new BeginningCalculator(peg.rules, true).calculate();
    const { parentsMap, indexMap } = new BottomUpTraverser(
      peg,
      beginning
    ).build();

    // fs.writeFileSync('graph.dot', genDot(peg, parentsMap));
    this.parentsMap = parentsMap;
    // console.log(indexMap);
    this.createHeap = getHeapCreator(indexMap, beginning, peg);
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
    const heap = this.createHeap();
    // console.log('heap was created for ' + pos, heap.size);
    while (!heap.empty()) {
      const rule = heap.pop() as Rule;
      const isGrowing = this.grow(rule, makePos(pos));
      if (!isGrowing) continue;
      const parents = this.parentsMap.get(rule);
      if (!parents) continue;
      parents.forEach((parent) => {
        heap.push(parent);
        // console.log('pushed: ', parent.symbol);
      });
    }
  }

  private grow(rule: Rule, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(rule);
    // console.log('Grow: ', rule.symbol);
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

function getHeapCreator(
  indexMap: Map<Rule, number>,
  beginning: Map<IParsingExpression, Set<IParsingExpression>>,
  peg: Peg
) {
  const beginWithTerminal = (rule: Rule) =>
    [...(beginning.get(rule.rhs) as Set<IParsingExpression>).values()].filter(
      (pe) => pe instanceof Terminal
    ).length > 0;
  const bottomRules = [...peg.rules.values()].filter(beginWithTerminal);

  const cmp = (a: Rule, b: Rule) =>
    (indexMap.get(a) as number) - (indexMap.get(b) as number);
  return (): PriorityQueue<Rule> => {
    const heap = new PriorityQueue(cmp);
    bottomRules.forEach((rule) => heap.push(rule));
    return heap;
  };
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
