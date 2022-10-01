import {
  Nonterminal,
  Terminal,
  ZeroOrMore,
  OneOrMore,
  Optional,
  Not,
  Sequence,
  OrderedChoice,
  Grouping,
  Rewriting,
  Colon,
  ColonNot,
  Lake,
  And,
} from './ParsingExpression';

export interface IParsingExpressionVisitor<T = void, U = void> {
  visitNonterminal(pe: Nonterminal, arg?: U): T;
  visitTerminal(pe: Terminal, arg?: U): T;
  visitZeroOrMore(pe: ZeroOrMore, arg?: U): T;
  visitOneOrMore(pe: OneOrMore, arg?: U): T;
  visitOptional(pe: Optional, arg?: U): T;
  visitAnd(pe: Not, arg?: U): T;
  visitNot(pe: Not, arg?: U): T;
  visitSequence(pe: Sequence, arg?: U): T;
  visitOrderedChoice(pe: OrderedChoice, arg?: U): T;
  visitGrouping(pe: Grouping, arg?: U): T;
  visitRewriting(pe: Rewriting, arg?: U): T;
  visitColon(pe: Colon, arg?: U): T;
  visitColonNot(pe: ColonNot, arg?: U): T;
  visitLake(pe: Lake, arg?: U): T;
}

export class DefaultParsingExpressionVisitor
  implements IParsingExpressionVisitor
{
  visitNonterminal(_pe: Nonterminal): void {
    // Do nothing
  }
  visitTerminal(_pe: Terminal): void {
    // Do nothing
  }
  visitOrderedChoice(_pe: OrderedChoice): void {
    // Do nothing
  }
  visitSequence(_pe: Sequence): void {
    // Do nothing
  }
  visitAnd(_pe: And): void {
    // Do nothing
  }
  visitColon(_pe: Colon): void {
    // Do nothing
  }
  visitColonNot(_pe: ColonNot): void {
    // Do nothing
  }
  visitGrouping(_pe: Grouping): void {
    // Do nothing
  }
  visitLake(_pe: Lake): void {
    // Do nothing
  }
  visitNot(_pe: Not): void {
    // Do nothing
  }
  visitOneOrMore(_pe: OneOrMore): void {
    // Do nothing
  }
  visitOptional(_pe: Optional): void {
    // Do nothing
  }
  visitRewriting(_pe: Rewriting): void {
    // Do nothing
  }
  visitZeroOrMore(_pe: ZeroOrMore): void {
    // Do nothing
  }
}
