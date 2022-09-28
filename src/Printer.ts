// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import {
  And,
  Colon,
  ColonNot,
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
    return pe.operand.accept(this) + '*';
  }
  visitOneOrMore(pe: OneOrMore): string {
    return pe.operand.accept(this) + '+';
  }
  visitOptional(pe: Optional): string {
    return pe.operand.accept(this) + '?';
  }
  visitAnd(pe: And): string {
    return '&' + pe.operand.accept(this);
  }
  visitNot(pe: Not): string {
    return '!' + pe.operand.accept(this);
  }
  visitSequence(pe: Sequence): string {
    return pe.operands.map((operand) => operand.accept(this)).join(' ');
  }
  visitOrderedChoice(pe: OrderedChoice): string {
    return pe.operands.map((operand) => operand.accept(this)).join(' / ');
  }
  visitGrouping(pe: Grouping): string {
    return '( ' + pe.operand.accept(this) + ' )';
  }
  visitRewriting(pe: Rewriting): string {
    return pe.operand.accept(this);
  }
  visitColon(pe: Colon): string {
    return pe.lhs.accept(this) + ':' + pe.rhs.accept(this);
  }
  visitColonNot(pe: ColonNot): string {
    return pe.lhs.accept(this) + ':!' + pe.rhs.accept(this);
  }
  visitLake(pe: Lake): string {
    return '<< ' + pe.operand.accept(this) + ' >>';
  }
}

export function peToString(pe: IParsingExpression): string {
  const printer = new Printer();
  return printer.buildString(pe);
}
