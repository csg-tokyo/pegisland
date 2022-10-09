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

export interface IParsingExpressionVisitor<
  ArgsType extends Array<unknown> = [],
  ReturnType = void
> {
  visitNonterminal(pe: Nonterminal, ...arg: ArgsType): ReturnType;
  visitTerminal(pe: Terminal, ...arg: ArgsType): ReturnType;
  visitZeroOrMore(pe: ZeroOrMore, ...arg: ArgsType): ReturnType;
  visitOneOrMore(pe: OneOrMore, ...arg: ArgsType): ReturnType;
  visitOptional(pe: Optional, ...arg: ArgsType): ReturnType;
  visitAnd(pe: Not, ...arg: ArgsType): ReturnType;
  visitNot(pe: Not, ...arg: ArgsType): ReturnType;
  visitSequence(pe: Sequence, ...arg: ArgsType): ReturnType;
  visitOrderedChoice(pe: OrderedChoice, ...arg: ArgsType): ReturnType;
  visitGrouping(pe: Grouping, ...arg: ArgsType): ReturnType;
  visitRewriting(pe: Rewriting, ...arg: ArgsType): ReturnType;
  visitColon(pe: Colon, ...arg: ArgsType): ReturnType;
  visitColonNot(pe: ColonNot, ...arg: ArgsType): ReturnType;
  visitLake(pe: Lake, ...arg: ArgsType): ReturnType;
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
