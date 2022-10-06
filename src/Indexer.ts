// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { getTopLevelExpressions } from './BottomUpParser';
import { DepthFirstTraverser } from './DepthFirstTraverser';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  Lake,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { Peg } from './Peg';

export class Indexer implements IParsingExpressionVisitor {
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

  visitLake(pe: Lake): void {
    this.giveIndex(pe);
  }
}
