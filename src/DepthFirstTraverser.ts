// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import {
  And,
  Colon,
  Grouping,
  IParsingExpression,
  IParsingExpressionVisitor,
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

export class DepthFirstTraverser implements IParsingExpressionVisitor {
  visitor: IParsingExpressionVisitor;
  visitedExpressions: Set<IParsingExpression> = new Set();

  constructor(
    visitor: IParsingExpressionVisitor,
    private startExpressions: IParsingExpression[]
  ) {
    this.visitor = visitor;
  }

  traverse(): void {
    this.startExpressions.forEach((e) => {
      e.accept(this);
    });
  }

  visitNonterminal(pe: Nonterminal): void {
    if (!this.visitedExpressions.has(pe.rule.rhs)) {
      this.visitedExpressions.add(pe.rule.rhs);
      pe.rule.rhs.accept(this);
    }
    pe.accept(this.visitor);
  }
  visitTerminal(pe: Terminal): void {
    pe.accept(this.visitor);
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitOneOrMore(pe: OneOrMore): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitOptional(pe: Optional): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitAnd(pe: And): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitNot(pe: Not): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitSequence(pe: Sequence): void {
    pe.operands.forEach((operand) => operand.accept(this));
    pe.accept(this.visitor);
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    pe.operands.forEach((operand) => operand.accept(this));
    pe.accept(this.visitor);
  }
  visitGrouping(pe: Grouping): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitRewriting(pe: Rewriting): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
  visitColon(pe: Colon): void {
    pe.lhs.accept(this);
    pe.rhs.accept(this);
    pe.accept(this.visitor);
  }
  visitColonNot(pe: Colon): void {
    pe.lhs.accept(this);
    pe.rhs.accept(this);
    pe.accept(this.visitor);
  }
  visitLake(pe: Lake): void {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }
}
