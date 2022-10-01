// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { IParsingExpression, Nonterminal } from './ParsingExpression';
import { PostorderExpressionTraverser } from './PostorderExpressionTraverser';

export class DepthFirstTraverser extends PostorderExpressionTraverser {
  visitedExpressions: Set<IParsingExpression> = new Set();

  constructor(
    visitor: IParsingExpressionVisitor,
    private startExpressions: IParsingExpression[]
  ) {
    super(visitor);
  }

  override traverse(): void {
    this.startExpressions.forEach((e) => {
      e.accept(this);
    });
  }

  override visitNonterminal(pe: Nonterminal): void {
    if (!this.visitedExpressions.has(pe.rule.rhs)) {
      this.visitedExpressions.add(pe.rule.rhs);
      pe.rule.rhs.accept(this);
    }
    pe.accept(this.visitor);
  }
}
