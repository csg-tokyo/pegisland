// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import {
  IParsingExpressionVisitor,
  IParsingExpression,
  PostorderExpressionTraverser,
  Nonterminal,
  Terminal,
  ZeroOrMore,
  OneOrMore,
  Optional,
  And,
  Not,
  Sequence,
  OrderedChoice,
  Grouping,
  Rewriting,
  Colon,
  ColonNot,
  Lake,
} from './ParsingExpression';

class Printer implements IParsingExpressionVisitor {
  private stack: string[] = [];

  buildString(pe: IParsingExpression) {
    const traverser = new PostorderExpressionTraverser(this);
    traverser.traverse(pe);
    return this.stack.pop() as string;
  }
  push(s: string) {
    this.stack.push(s);
  }
  pop(): string {
    return this.stack.pop() as string;
  }

  visitNonterminal(pe: Nonterminal): void {
    this.push(pe.rule.symbol);
  }
  visitTerminal(pe: Terminal): void {
    this.push(pe.source);
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    this.push(this.pop() + '*');
  }
  visitOneOrMore(pe: OneOrMore): void {
    this.push(this.pop() + '+');
  }
  visitOptional(pe: Optional): void {
    this.push(this.pop() + '?');
  }
  visitAnd(pe: And): void {
    this.push('&' + this.pop());
  }
  visitNot(pe: Not): void {
    this.push('!' + this.pop());
  }
  visitSequence(pe: Sequence): void {
    this.push(
      pe.operands
        .map(() => this.pop())
        .reverse()
        .join(' ')
    );
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    this.push(
      pe.operands
        .map(() => this.pop())
        .reverse()
        .join(' / ')
    );
  }
  visitGrouping(pe: Grouping): void {
    this.push('( ' + this.pop() + ' )');
  }
  visitRewriting(pe: Rewriting): void {
    this.push(this.pop());
  }
  visitColon(pe: Colon): void {
    const rhs = this.pop();
    const lhs = this.pop();
    this.push(lhs + ':' + rhs);
  }
  visitColonNot(pe: ColonNot): void {
    const rhs = this.pop();
    const lhs = this.pop();
    this.push(lhs + '!:' + rhs);
  }
  visitLake(pe: Lake): void {
    this.push('<< ' + this.pop() + ' >>');
  }
}

export function peToString(pe: IParsingExpression): string {
  const printer = new Printer();
  return printer.buildString(pe);
}
