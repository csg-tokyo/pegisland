// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
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
import { PostorderExpressionTraverser } from './PostorderExpressionTraverser';
import { Rule } from './Rule';

export class ExpressionCollector implements IParsingExpressionVisitor {
  expressions: IParsingExpression[] = [];

  collect(rules: Map<string, Rule>): IParsingExpression[] {
    this.expressions = [];
    const traverser = new PostorderExpressionTraverser(this);
    rules.forEach((rule) => traverser.traverse(rule.rhs));
    return this.expressions;
  }

  visitNonterminal(pe: Nonterminal): void {
    this.expressions.push(pe);
  }

  visitTerminal(pe: Terminal): void {
    this.expressions.push(pe);
  }

  visitZeroOrMore(pe: ZeroOrMore): void {
    this.expressions.push(pe);
  }

  visitOneOrMore(pe: OneOrMore): void {
    this.expressions.push(pe);
  }

  visitOptional(pe: Optional): void {
    this.expressions.push(pe);
  }

  visitAnd(pe: And): void {
    this.expressions.push(pe);
  }

  visitNot(pe: Not): void {
    this.expressions.push(pe);
  }

  visitSequence(pe: Sequence): void {
    this.expressions.push(pe);
  }

  visitOrderedChoice(pe: OrderedChoice): void {
    this.expressions.push(pe);
  }

  visitGrouping(pe: Grouping): void {
    this.expressions.push(pe);
  }

  visitRewriting(pe: Rewriting): void {
    this.expressions.push(pe);
  }

  visitColon(pe: Colon): void {
    this.expressions.push(pe);
  }

  visitColonNot(pe: ColonNot): void {
    this.expressions.push(pe);
  }

  visitLake(pe: Lake): void {
    this.expressions.push(pe);
  }
}
