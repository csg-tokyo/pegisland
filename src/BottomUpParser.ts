// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import Heap from 'heap';
import lineColumn from 'line-column';
import { BeginningCalculator } from './BeginningCalculator';
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
  Position,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
  NullParsingExpression,
  PostorderExpressionTraverser,
} from './ParsingExpression';
import { Peg } from './Peg';
import { peToString } from './Printer';

export class BottomupParsingEnv extends BaseParsingEnv {
  private memo: Map<IParsingExpression, [IParseTree, Position] | null>[] = [];
  private createHeap;
  private parentsMap: Map<IParsingExpression, Set<IParsingExpression>>;

  constructor(public s: string, private peg: Peg) {
    super();
    for (let i = 0; i <= s.length; i++) {
      this.memo.push(
        new Map<IParsingExpression, [IParseTree, Position] | null>()
      );
    }

    this.parentsMap = createParentsMap(this.peg);
    this.createHeap = getHeapCreator(this.peg, this.parentsMap);
  }

  parseString(s: string, start: string): [IParseTree, Position] | Error {
    const dummy = ' ';
    const finder = lineColumn(s + dummy);
    for (let pos = s.length; pos >= 0; pos--) {
      const [heap, _indexMap] = this.createHeap();
      const set = new Set<IParsingExpression>(heap.toArray());
      // console.log('heap was created for ' + pos, heap.size());

      while (!heap.empty()) {
        const pe = heap.pop() as IParsingExpression;
        set.delete(pe);
        const info = finder.fromIndex(pos) as {
          line: number;
          col: number;
        };
        const isGlowing = this.glow(pe, new Position(pos, info.line, info.col));

        /*
        if (isGlowing)
          console.log(
            pos,
            heap.size(),
            peToString(pe) + ' was poped!' + (this.memo[pos].get(pe) != null)
          );
        */

        if (isGlowing) {
          const parents = this.parentsMap.get(pe);
          if (parents != undefined) {
            parents.forEach((parent) => {
              if (!set.has(parent)) {
                heap.push(parent);
                set.add(parent);
                //console.log(peToString(parent) + ' was pushed!');
              }
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
      return Error(`${peToString(startRule.rhs)} is not found`);
    }
    return result;
  }

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    if (!this.memo[pos.offset].has(rule.rhs)) {
      this.memo[pos.offset].set(rule.rhs, null);
    }
    return this.memo[pos.offset].get(rule.rhs) as [IParseTree, Position] | null;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    return pe.parse(this, pos);
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

class ParentsBuilder implements IParsingExpressionVisitor {
  private parents: Map<IParsingExpression, Set<IParsingExpression>> = new Map();
  private rule: Rule = new Rule('dummy', new NullParsingExpression());
  private beginningSet = new Set<IParsingExpression>();

  build(peg: Peg) {
    const beginningSets = new BeginningCalculator(peg.rules, true).calculate();
    const traverser = new PostorderExpressionTraverser(this);
    [...peg.rules.values()].forEach((rule) => {
      this.rule = rule;
      this.beginningSet = beginningSets.get(
        rule.rhs
      ) as Set<IParsingExpression>;
      traverser.traverse(rule.rhs);
    });
    return this.parents;
  }

  addParent(pe: IParsingExpression, parent: IParsingExpression) {
    if (!this.parents.has(pe)) {
      this.parents.set(pe, new Set());
    }
    const parents = this.parents.get(pe) as Set<IParsingExpression>;
    parents.add(parent);
  }

  visitNonterminal(pe: Nonterminal): void {
    if (this.beginningSet.has(pe)) {
      this.addParent(pe.rule.rhs, this.rule.rhs);
    }
  }

  visitTerminal(pe: Terminal): void {
    if (this.beginningSet.has(pe) && pe != this.rule.rhs) {
      this.addParent(pe, this.rule.rhs);
    }
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
  peg: Peg,
  parentsMap: Map<IParsingExpression, Set<IParsingExpression>>
) {
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
    terminals.filter(hasParent).forEach((terminal) => {
      heap.push(terminal);
    });
    return [heap, indexMap];
  };

  function hasParent(pe: IParsingExpression) {
    return parentsMap.has(pe);
  }
}

function createParentsMap(peg: Peg) {
  const parentsBuilder = new ParentsBuilder();
  const parentsMap = parentsBuilder.build(peg);
  return parentsMap;
}

export class BottomUpParser {
  constructor(private peg: Peg) {}

  parse(s: string, start?: string): IParseTree | Error {
    const env = new BottomupParsingEnv(s, this.peg);
    if (start == undefined) {
      return Error('start symbol must be given.');
    }
    const result = env.parseString(s, start);
    if (result instanceof Error) {
      return result;
    }
    const [tree, _pos] = result;
    return tree;
  }
}
