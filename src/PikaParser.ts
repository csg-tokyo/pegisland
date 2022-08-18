// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import Heap from 'heap';
import { BeginningCalculator } from './BeginningCalculator';
import { DepthFirstTraverser } from './DepthFirstTraverser';
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
  Position,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
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

  parseString(s: string, start: string): [IParseTree, Position] | null {
    for (let pos = s.length; pos >= 0; pos--) {
      const [heap, _indexMap] = this.createHeap();
      const set = new Set<IParsingExpression>(heap.toArray());
      // console.log('heap was created for ' + pos, heap.size());

      while (!heap.empty()) {
        const pe = heap.pop() as IParsingExpression;
        set.delete(pe);
        const isGlowing = this.glow(pe, new Position(pos, -1, -1)); // XXX
        /*
        console.log(
          pos,
          heap.size(),
          show(pe) + indexMap.get(pe) + ' was poped!' + isGlowing
        );
        */
        if (isGlowing) {
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
    if (!this.peg.rules.has(start)) {
      return null;
    }
    const startRule = this.peg.rules.get(start) as Rule;
    if (startRule == undefined) {
      return null;
    }
    return startRule.parse(this, new Position(0, 1, 1));
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

  isGlowing(
    result: [IParseTree, Position] | null,
    oldResult: [IParseTree, Position] | null
  ): boolean {
    if (oldResult == null) {
      // console.log('oldResult is null');
      return result != null;
    } else if (result == null) {
      return false;
    } else {
      const [_tree, pos] = result;
      const [_oldTree, oldPos] = oldResult;
      //console.log(pos.offset, oldPos.offset);
      return pos.offset > oldPos.offset;
    }
  }

  glow(pe: IParsingExpression, pos: Position): boolean {
    const isFirstEval = !this.memo[pos.offset].has(pe);
    //console.log('glow ' + show(pe));
    if (isFirstEval) {
      this.memo[pos.offset].set(pe, null);
    }
    const result = pe.parse(this, pos);
    const oldResult = this.memo[pos.offset].get(pe) as
      | null
      | [IParseTree, Position];
    if (isFirstEval || this.isGlowing(result, oldResult)) {
      this.memo[pos.offset].set(pe, result);
      //console.log(result);
      return true;
    } else {
      return false;
    }
  }
}

class Indexer implements IParsingExpressionVisitor {
  private indexMap: Map<IParsingExpression, number> = new Map();
  private index = 0;
  private terminals: IParsingExpression[] = [];

  build(peg: Peg): [Map<IParsingExpression, number>, IParsingExpression[]] {
    const traverser = new DepthFirstTraverser(
      this,
      getTopLevelExpressions(peg)
    );
    traverser.traverse();
    return [this.indexMap, this.terminals];
  }

  giveIndex(pe: IParsingExpression) {
    this.indexMap.set(pe, this.index++);
  }

  visitNonterminal(pe: Nonterminal): void {
    this.giveIndex(pe);
  }
  visitTerminal(pe: Terminal): void {
    this.terminals.push(pe);
    this.giveIndex(pe);
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    this.giveIndex(pe);
  }
  visitOneOrMore(pe: OneOrMore): void {
    this.giveIndex(pe);
  }
  visitOptional(pe: Optional): void {
    this.giveIndex(pe);
  }
  visitAnd(pe: And): void {
    this.giveIndex(pe);
  }
  visitNot(pe: Not): void {
    this.giveIndex(pe);
  }
  visitSequence(pe: Sequence): void {
    this.giveIndex(pe);
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    this.giveIndex(pe);
  }
  visitGrouping(pe: Grouping): void {
    this.giveIndex(pe);
  }
  visitRewriting(pe: Rewriting): void {
    this.giveIndex(pe);
  }
  visitColon(pe: Colon): void {
    this.giveIndex(pe);
  }
  visitColonNot(pe: ColonNot): void {
    this.giveIndex(pe);
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
    if (start == undefined) {
      return Error('start symbol must be given.');
    }
    const result = env.parseString(s, start);
    if (result == null) {
      return Error('error');
    }
    const [tree, _pos] = result;
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
