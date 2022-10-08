// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import Heap from 'heap';
import { BeginningCalculator } from './set/BeginningCalculator';
import { DepthFirstTraverser } from './DepthFirstTraverser';
import { Indexer } from './Indexer';
import { IParseTree } from './ParseTree';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
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
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { BaseParsingEnv } from './IParsingEnv';
import { Position } from './Position';
import { Peg } from './Peg';
import { EPSILON } from './set/SetCalculator';
import {
  BottomUpParserBase,
  getTopLevelExpressions,
  isGrowing,
} from './BottomUpParser';

export class PikaParsingEnv extends BaseParsingEnv<IParsingExpression> {
  private createHeap;

  private parentsMap;

  constructor(s: string, private peg: Peg) {
    super(s);

    this.parentsMap = createParentsMap(this.peg);
    this.createHeap = getHeapCreator(this.peg);
  }

  parseString(s: string, start: string): [IParseTree, Position] | Error {
    this.fillMemoTable(s);
    const startRule = this.peg.rules.get(start);
    if (!startRule) {
      return Error(`${start} is not a valid nonterminal symbol.`);
    }
    const result = startRule.parse(this, new Position(0, 1, 1));
    if (result === null) {
      return Error(`Failed to recognize ${start}`);
    }
    return result;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    // console.log('offset: ' + pos.offset);
    if (!this.memo[pos.offset].has(pe)) {
      this.memo[pos.offset].set(pe, null);
      // const result = pe.parse(this, pos);
      // assert(result == null, `${show(pe)} should be null`);
      // this.memo[pos.offset].set(pe, result);
    }
    return this.memo[pos.offset].get(pe) as [IParseTree, Position] | null;
  }

  private grow(pe: IParsingExpression, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(pe);
    // console.log('grow ' + show(pe));
    if (isFirstEval) {
      this.memo[pos.offset].set(pe, null);
    }
    const result = pe.accept(this.recognizer, pos);
    const oldResult = this.memo[pos.offset].get(pe) as
      | null
      | [IParseTree, Position];
    if (isFirstEval || isGrowing(result, oldResult)) {
      this.memo[pos.offset].set(pe, result);
      // console.log(result);
      return true;
    }
    return false;
  }

  private fillMemoTable(s: string) {
    for (let pos = s.length; pos >= 0; pos--) {
      this.fillMemoEntry(pos);
    }
  }

  private fillMemoEntry(pos: number) {
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
      if (!isGrowing) continue;
      const parents = this.parentsMap.get(pe);
      if (!parents) continue;
      parents
        .filter((parent) => !set.has(parent))
        .forEach((parent) => {
          // console.log(show(parent) + ' was pushed!');
          heap.push(parent);
          set.add(parent);
        });
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
    for (const operand of pe.operands) {
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
    this.visitBinaryOperator(pe);
  }

  visitColonNot(pe: ColonNot): void {
    this.visitBinaryOperator(pe);
  }

  visitLake(pe: Lake): void {
    this.addParent(pe.operand, pe);
  }

  private visitBinaryOperator(pe: Colon | ColonNot) {
    this.addParent(pe.lhs, pe);
    this.addParent(pe.rhs, pe);
  }
}

function getHeapCreator(peg: Peg) {
  const indexer = new Indexer();
  const [indexMap, terminals] = indexer.build(peg);
  /*
  console.log(
    'terminals: ' + terminals.map((terminal) => (terminal as Terminal).source)
  );
  */
  const cmp = (a: IParsingExpression, b: IParsingExpression) =>
    (indexMap.get(a) as number) - (indexMap.get(b) as number);
  return (): [Heap<IParsingExpression>, Map<IParsingExpression, number>] => {
    const heap = new Heap<IParsingExpression>(cmp);
    terminals.forEach((terminal) => {
      heap.push(terminal);
    });
    return [heap, indexMap];
  };
}

export class PikaParser extends BottomUpParserBase {
  constructor(peg: Peg) {
    super(peg, PikaParsingEnv);
  }
}

function createParentsMap(peg: Peg) {
  const beginningCalculator = new BeginningCalculator(peg.rules);
  const beginningSets = beginningCalculator.calculate();
  const parentsBuilder = new ParentsBuilder(beginningSets);
  const parentsMap = parentsBuilder.build(peg);
  return parentsMap;
}
