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
  ColonNot,
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

  private visitSymbol(pe: Nonterminal | Terminal) {
    pe.accept(this.visitor);
  }

  private visitOperatorWithOneOperand(
    pe:
      | ZeroOrMore
      | OneOrMore
      | Optional
      | Not
      | And
      | Grouping
      | Rewriting
      | Lake
  ) {
    pe.operand.accept(this);
    pe.accept(this.visitor);
  }

  private visitOperatorWithTwoOperands(pe: Colon | ColonNot) {
    pe.lhs.accept(this);
    pe.rhs.accept(this);
    pe.accept(this.visitor);
  }

  private visitOperatorWithMultipleOperands(pe: Sequence | OrderedChoice) {
    pe.operands.forEach((operand) => operand.accept(this));
    pe.accept(this.visitor);
  }

  visitNonterminal(pe: Nonterminal): void {
    this.visitSymbol(pe);
  }
  visitTerminal(pe: Terminal): void {
    this.visitSymbol(pe);
  }
  visitZeroOrMore(pe: ZeroOrMore): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitOneOrMore(pe: OneOrMore): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitOptional(pe: Optional): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitAnd(pe: And): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitNot(pe: Not): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitSequence(pe: Sequence): void {
    this.visitOperatorWithMultipleOperands(pe);
  }
  visitOrderedChoice(pe: OrderedChoice): void {
    this.visitOperatorWithMultipleOperands(pe);
  }
  visitGrouping(pe: Grouping): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitRewriting(pe: Rewriting): void {
    this.visitOperatorWithOneOperand(pe);
  }
  visitColon(pe: Colon): void {
    this.visitOperatorWithTwoOperands(pe);
  }
  visitColonNot(pe: ColonNot): void {
    this.visitOperatorWithTwoOperands(pe);
  }
  visitLake(pe: Lake): void {
    this.visitOperatorWithOneOperand(pe);
  }
}
