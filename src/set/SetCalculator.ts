// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { ExpressionCollector } from '../ExpressionCollector';
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
} from '../ParsingExpression';
import { IParsingExpressionVisitor } from '../IParsingExpressionVisitor';
import { Rule } from '../Rule';
import { getValue } from '../utils';

export const EPSILON = new Sequence([]);

export abstract class SetCalculator implements IParsingExpressionVisitor {
  readonly peSet: Map<IParsingExpression, Set<IParsingExpression>>;

  private readonly expressions;

  constructor(rules: Map<string, Rule>, isPostorder: boolean) {
    this.expressions = new ExpressionCollector().collect(rules);
    if (!isPostorder) {
      this.expressions.reverse();
    }
    this.peSet = new Map(this.expressions.map((pe) => [pe, new Set()]));
  }

  public calculate(): Map<IParsingExpression, Set<IParsingExpression>> {
    for (;;) {
      const sizeMap = new Map(
        this.expressions.map((pe) => [pe, this.get(pe).size])
      );
      this.expressions.forEach((pe) => pe.accept(this));
      const wasChanged = this.expressions.some(
        (pe) => sizeMap.get(pe) !== this.get(pe).size
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
