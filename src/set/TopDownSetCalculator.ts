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
    public readonly beginning: Map<IParsingExpression, Set<IParsingExpression>>
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

  abstract override visitZeroOrMore(pe: ZeroOrMore): void;

  abstract override visitOneOrMore(pe: OneOrMore): void;

  abstract override visitOptional(pe: Optional): void;

  abstract override visitAnd(pe: And): void;

  abstract override visitNot(pe: Not): void;

  abstract override visitSequence(pe: Sequence): void;

  abstract override visitOrderedChoice(pe: OrderedChoice): void;

  abstract override visitGrouping(pe: Grouping): void;

  abstract override visitRewriting(pe: Rewriting): void;

  abstract override visitColon(pe: Colon): void;

  abstract override visitColonNot(pe: ColonNot): void;

  abstract override visitLake(pe: Lake): void;
}
