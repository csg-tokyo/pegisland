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
import { Rule } from '../Rule';
import { getValue } from '../utils';
import { SetCalculator } from './SetCalculator';
import { union } from '../set-operations';

export abstract class TopDownSetCalculator extends SetCalculator {
  constructor(
    rules: Map<string, Rule>,
    public beginning: Map<IParsingExpression, Set<IParsingExpression>>
  ) {
    super(rules, false);
  }

  getBeginning(pe: IParsingExpression): Set<IParsingExpression> {
    return getValue(this.beginning, pe);
  }

  visitNonterminal(pe: Nonterminal): void {
    this.set(pe.rule.rhs, union(this.get(pe.rule.rhs), this.get(pe)));
  }

  visitTerminal(_pe: Terminal): void {
    // do nothing
  }

  protected propagateToOperand(
    pe: Grouping | Rewriting | Lake | Optional
  ): void {
    this.propagate(pe, pe.operand);
  }

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
