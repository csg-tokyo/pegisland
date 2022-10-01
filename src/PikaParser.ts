// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import assert from 'assert';
import Heap from 'heap';
import { BeginningCalculator } from './BeginningCalculator';
import { DepthFirstTraverser } from './DepthFirstTraverser';
import { Indexer } from './Indexer';
import { IParseTree } from './ParseTree';
import {
  And,
  BaseParsingEnv,
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
  Lake,
} from './ParsingExpression';
import { Position } from './Position';
import { Peg } from './Peg';
import { EPSILON } from './SetCalculator';

export class PikaParsingEnv extends BaseParsingEnv {
  private memo: Map<IParsingExpression, [IParseTree, Position] | null>[] = [];
  private createHeap;
  private parentsMap;

  constructor(public s: string, private peg: Peg) {
    super();
    for (let i = 0; i <= s.length; i++) {
      this.memo.push(
        new Map<IParsingExpression, [IParseTree, Position] | null>()
      );
    }

    this.parentsMap = createParentsMap(this.peg);
    this.createHeap = getHeapCreator(this.peg);
  }

  parseString(s: string, start: string): [IParseTree, Position] | Error {
    for (let pos = s.length; pos >= 0; pos--) {
      const [heap] = this.createHeap();
      const set = new Set<IParsingExpression>(heap.toArray());
      // console.log('heap was created for ' + pos, heap.size());

      while (!heap.empty()) {
        const pe = heap.pop() as IParsingExpression;
        set.delete(pe);
        const isGrowing = this.grow(pe, new Position(pos, -1, -1)); // XXX
        /*
        console.log(
          pos,
          heap.size(),
          show(pe) + indexMap.get(pe) + ' was poped!' + isGrowing
        );
        */
        if (isGrowing) {
          const parents = this.parentsMap.get(pe);
          if (parents != undefined) {
            parents.forEach((parent) => {
              //console.log(show(parent) + ' was pushed!');
              if (!set.has(parent)) {
                heap.push(parent);
                set.add(parent);
              }
            });
          }
        }
      }
    }
    const startRule = this.peg.rules.get(start);
    if (startRule == undefined) {
      return Error(`${start} is not a valid nonterminal symbol.`);
    }
    const result = startRule.parse(this, new Position(0, 1, 1));
    if (result == null) {
      return Error(`Failed to recognize ${start}`);
    }
    return result;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    //console.log('offset: ' + pos.offset);
    if (!this.memo[pos.offset].has(pe)) {
      this.memo[pos.offset].set(pe, null);
      //const result = pe.parse(this, pos);
      //assert(result == null, `${show(pe)} should be null`);
      //this.memo[pos.offset].set(pe, result);
    }
    return this.memo[pos.offset].get(pe) as [IParseTree, Position] | null;
  }

  isGrowing(
    result: [IParseTree, Position] | null,
    oldResult: [IParseTree, Position] | null
  ): boolean {
    if (oldResult == null) {
      // console.log('oldResult is null');
      return result != null;
    } else {
      assert(result != null, "result can't be null once it was not null");
      const [, pos] = result;
      const [, oldPos] = oldResult;
      //console.log(pos.offset, oldPos.offset);
      return pos.offset > oldPos.offset;
    }
  }

  grow(pe: IParsingExpression, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(pe);
    //console.log('grow ' + show(pe));
    if (isFirstEval) {
      this.memo[pos.offset].set(pe, null);
    }
    const result = pe.accept(this.recognizer, pos);
    const oldResult = this.memo[pos.offset].get(pe) as
      | null
      | [IParseTree, Position];
    if (isFirstEval || this.isGrowing(result, oldResult)) {
      this.memo[pos.offset].set(pe, result);
      //console.log(result);
      return true;
    } else {
      return false;
    }
  }
}

class ParentsBuilder implements IParsingExpressionVisitor {
  private parents: Map<IParsingExpression, IParsingExpression[]> = new Map();

  constructor(
    private beginning: Map<IParsingExpression, Set<IParsingExpression>>
  ) {}

  build(peg: Peg) {
    const traverser = new DepthFirstTraverser(
      this,
      getTopLevelExpressions(peg)
    );
    traverser.traverse();
    return this.parents;
  }

  addParent(pe: IParsingExpression, parent: IParsingExpression) {
    if (!this.parents.has(pe)) {
      this.parents.set(pe, []);
    }
    const parents = this.parents.get(pe) as IParsingExpression[];
    parents.push(parent);
  }

  visitNonterminal(pe: Nonterminal): void {
    this.addParent(pe.rule.rhs, pe);
  }

  visitTerminal(_pe: Terminal): void {
    // Nothing to be done
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    this.addParent(pe.operand, pe);
  }
  visitOneOrMore(pe: OneOrMore): void {
    this.addParent(pe.operand, pe);
  }
  visitOptional(pe: Optional): void {
    this.addParent(pe.operand, pe);
  }
  visitAnd(pe: And): void {
    this.addParent(pe.operand, pe);
  }
  visitNot(pe: Not): void {
    this.addParent(pe.operand, pe);
  }
  visitSequence(pe: Sequence): void {
    for (const i in pe.operands) {
      const operand = pe.operands[i];
      this.addParent(operand, pe);
      const beginningSet = this.beginning.get(
        operand
      ) as Set<IParsingExpression>;
      if (!beginningSet.has(EPSILON)) {
        break;
      }
    }
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    pe.operands.forEach((operand) => {
      this.addParent(operand, pe);
    });
  }
  visitGrouping(pe: Grouping): void {
    this.addParent(pe.operand, pe);
  }
  visitRewriting(pe: Rewriting): void {
    this.addParent(pe.operand, pe);
  }
  visitColon(pe: Colon): void {
    // XXX
    this.addParent(pe.lhs, pe);
    this.addParent(pe.rhs, pe);
  }
  visitColonNot(pe: ColonNot): void {
    // XXX
    this.addParent(pe.lhs, pe);
    this.addParent(pe.rhs, pe);
  }
  visitLake(pe: Lake): void {
    this.addParent(pe.operand, pe);
  }
}

function getTopLevelExpressions(peg: Peg): IParsingExpression[] {
  return getTopLevelRules(peg).map((rule) => rule.rhs);
}

function getTopLevelRules(peg: Peg) {
  return peg.toplevelRules.length > 0
    ? peg.toplevelRules
    : [peg.rules.values().next().value as Rule];
}

function getHeapCreator(peg: Peg) {
  const indexer = new Indexer();
  const [indexMap, terminals] = indexer.build(peg);
  /*
  console.log(
    'terminals: ' + terminals.map((terminal) => (terminal as Terminal).source)
  );
  */
  const cmp = (a: IParsingExpression, b: IParsingExpression) => {
    return (indexMap.get(a) as number) - (indexMap.get(b) as number);
  };
  return (): [Heap<IParsingExpression>, Map<IParsingExpression, number>] => {
    const heap = new Heap<IParsingExpression>(cmp);
    terminals.forEach((terminal) => {
      heap.push(terminal);
    });
    return [heap, indexMap];
  };
}

export class PikaParser {
  constructor(private peg: Peg) {}

  parse(s: string, start?: string): IParseTree | Error {
    const env = new PikaParsingEnv(s, this.peg);
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

function createParentsMap(peg: Peg) {
  const beginningCalculator = new BeginningCalculator(peg.rules);
  const beginningSets = beginningCalculator.calculate();
  const parentsBuilder = new ParentsBuilder(beginningSets);
  const parentsMap = parentsBuilder.build(peg);
  return parentsMap;
}
