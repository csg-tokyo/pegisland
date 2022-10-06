// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
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

class Printer implements IParsingExpressionVisitor<string> {
  buildString(pe: IParsingExpression) {
    return pe.accept(this);
  }

  visitNonterminal(pe: Nonterminal): string {
    return pe.rule.symbol;
  }

  visitTerminal(pe: Terminal): string {
    return pe.source;
  }

  visitZeroOrMore(pe: ZeroOrMore): string {
    return this.suffixOperator(pe, '*');
  }

  visitOneOrMore(pe: OneOrMore): string {
    return this.suffixOperator(pe, '+');
  }

  visitOptional(pe: Optional): string {
    return this.suffixOperator(pe, '?');
  }

  visitAnd(pe: And): string {
    return this.prefixOperator(pe, '&');
  }

  visitNot(pe: Not): string {
    return this.prefixOperator(pe, '!');
  }

  visitSequence(pe: Sequence): string {
    return this.separatingOperator(pe, ' ');
  }

  visitOrderedChoice(pe: OrderedChoice): string {
    return this.separatingOperator(pe, ' / ');
  }

  visitGrouping(pe: Grouping): string {
    return this.surroundingOperator(pe, '( ', ' )');
  }

  visitRewriting(pe: Rewriting): string {
    return pe.operand.accept(this);
  }

  visitColon(pe: Colon): string {
    return this.infixOperator(pe, ':');
  }

  visitColonNot(pe: ColonNot): string {
    return this.infixOperator(pe, ':!');
  }

  visitLake(pe: Lake): string {
    return this.surroundingOperator(pe, '<< ', ' >>');
  }

  private separatingOperator(
    pe: Sequence | OrderedChoice,
    operator: string
  ): string {
    return pe.operands.map((operand) => operand.accept(this)).join(operator);
  }

  private suffixOperator(
    pe: ZeroOrMore | OneOrMore | Optional,
    operator: string
  ): string {
    return pe.operand.accept(this) + operator;
  }

  private prefixOperator(pe: And | Not, operator: string): string {
    return operator + pe.operand.accept(this);
  }

  private infixOperator(pe: Colon | ColonNot, operator: string): string {
    return pe.lhs.accept(this) + operator + pe.rhs.accept(this);
  }

  private surroundingOperator(
    pe: Grouping | Lake,
    left: string,
    right: string
  ): string {
    return left + pe.operand.accept(this) + right;
  }
}

export function peToString(pe: IParsingExpression): string {
  const printer = new Printer();
  return printer.buildString(pe);
}
