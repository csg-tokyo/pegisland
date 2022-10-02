// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { ExpressionCollector } from './ExpressionCollector';
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
import { Rule } from './Rule';
import { getValue } from './utils';

export const EPSILON = new Sequence([]);

export abstract class SetCalculator implements IParsingExpressionVisitor {
  private expressions;
  public peSet: Map<IParsingExpression, Set<IParsingExpression>>;

  constructor(rules: Map<string, Rule>, isPostorder: boolean) {
    const collector = new ExpressionCollector();
    this.expressions = collector.collect(rules);
    if (!isPostorder) {
      this.expressions.reverse();
    }
    this.peSet = new Map();
    this.expressions.forEach((pe) => this.peSet.set(pe, new Set()));
  }

  public calculate(): Map<IParsingExpression, Set<IParsingExpression>> {
    const sizeMap = new Map<IParsingExpression, number>();
    for (;;) {
      this.expressions.forEach((pe) => sizeMap.set(pe, this.get(pe).size));
      this.expressions.forEach((pe) => pe.accept(this));
      const wasChanged = this.expressions.some(
        (pe) => sizeMap.get(pe) != this.get(pe).size
      );
      if (!wasChanged) {
        break;
      }
    }
    return this.peSet;
  }

  protected get(pe: IParsingExpression): Set<IParsingExpression> {
    return getValue(this.peSet, pe);
  }

  protected set(pe: IParsingExpression, set: Set<IParsingExpression>): void {
    this.peSet.set(pe, set);
  }

  protected propagate(src: IParsingExpression, dst: IParsingExpression): void {
    this.set(dst, new Set(this.get(src)));
  }

  abstract visitNonterminal(pe: Nonterminal): void;
  abstract visitTerminal(pe: Terminal): void;
  abstract visitZeroOrMore(pe: ZeroOrMore): void;
  abstract visitOneOrMore(pe: OneOrMore): void;
  abstract visitOptional(pe: Optional): void;
  abstract visitAnd(pe: And): void;
  abstract visitNot(pe: Not): void;
  abstract visitSequence(pe: Sequence): void;
  abstract visitOrderedChoice(pe: OrderedChoice): void;
  abstract visitGrouping(pe: Grouping): void;
  abstract visitRewriting(pe: Rewriting): void;
  abstract visitColon(pe: Colon): void;
  abstract visitColonNot(pe: ColonNot): void;
  abstract visitLake(pe: Lake): void;
}
