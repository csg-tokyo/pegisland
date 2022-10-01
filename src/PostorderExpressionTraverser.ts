import {
  IParsingExpression,
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
  Lake,
} from './ParsingExpression';
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';

export class PostorderExpressionTraverser implements IParsingExpressionVisitor {
  visitor: IParsingExpressionVisitor;

  constructor(visitor: IParsingExpressionVisitor) {
    this.visitor = visitor;
  }

  traverse(pe: IParsingExpression): void {
    pe.accept(this);
  }

  visitNonterminal(pe: Nonterminal): void {
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
