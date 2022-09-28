// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import assert from 'assert';
import {
  IParseTree,
  NodeAnd,
  NodeGrouping,
  NodeLake,
  NodeNot,
  NodeOneOrMore,
  NodeOptional,
  NodeOrderedChoice,
  NodeRewriting,
  NodeSequence,
  NodeTerminal,
  NodeZeroOrMore,
  Range,
} from './ParseTree';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingEnv,
  IParsingExpressionVisitor,
  Lake,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Position,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';

export class Recognizer
  implements IParsingExpressionVisitor<[IParseTree, Position] | null, Position>
{
  constructor(private env: IParsingEnv) {}

  visitNonterminal(
    pe: Nonterminal,
    pos: Position
  ): [IParseTree, Position] | null {
    //const result = this.rule.parse(env, pos);
    const result = this.env.parseRule(pe.rule, pos);
    if (pe.name == '') {
      return result;
    }
    if (result == null) {
      return result;
    }
    const [_, end] = result;
    const value = this.env.s.substring(pos.offset, end.offset).trim();
    if (!this.env.has(pe.name)) {
      this.env.register(pe.name, value);
    } else {
      if (value != this.env.lookup(pe.name)) {
        return null;
      }
    }
    return result;
  }

  visitTerminal(pe: Terminal, pos: Position): [IParseTree, Position] | null {
    pe.regex.lastIndex = pos.offset;
    const m = this.env.s.match(pe.regex);
    if (m == null) {
      return null;
    }
    const text = m[0];
    const length = text.length;
    const nextIndex = pos.offset + length;
    const lines = text.split('\n');
    const baseCol = lines.length == 1 ? pos.column : 1;
    const nextPos = new Position(
      nextIndex,
      pos.line + lines.length - 1,
      baseCol + lines[lines.length - 1].length
    );
    return [new NodeTerminal(new Range(pos, nextPos), pe.regex, text), nextPos];
  }

  visitZeroOrMore(
    pe: ZeroOrMore,
    pos: Position
  ): [IParseTree, Position] | null {
    const values: IParseTree[] = [];
    let prevIndex = null;
    let nextIndex = pos;
    while (nextIndex != prevIndex) {
      prevIndex = nextIndex;
      const result = this.env.parse(pe.operand, nextIndex);
      if (!result) {
        break;
      }
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeZeroOrMore(new Range(pos, nextIndex), values), nextIndex];
  }

  visitOneOrMore(pe: OneOrMore, pos: Position): [IParseTree, Position] | null {
    let prevIndex = pos;
    const result = this.env.parse(pe.operand, pos);
    if (!result) {
      return null;
    }
    let [value, nextIndex] = result;
    const values: IParseTree[] = [value];
    while (nextIndex != prevIndex) {
      prevIndex = nextIndex;
      const result = this.env.parse(pe.operand, nextIndex);
      if (!result) {
        break;
      }
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeOneOrMore(new Range(pos, nextIndex), values), nextIndex];
  }

  visitOptional(pe: Optional, pos: Position): [IParseTree, Position] | null {
    const values: IParseTree[] = [];
    let nextIndex = pos;
    const result = this.env.parse(pe.operand, nextIndex);
    if (result) {
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeOptional(new Range(pos, nextIndex), values), nextIndex];
  }

  visitAnd(pe: And, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result == null) {
      return null;
    }
    const [value, nextIndex] = result;
    return [new NodeAnd(new Range(pos, nextIndex), value), pos];
  }

  visitNot(pe: Not, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result != null) {
      return null;
    }
    return [new NodeNot(new Range(pos, pos)), pos];
  }

  visitSequence(pe: Sequence, pos: Position): [IParseTree, Position] | null {
    const values = [];
    let nextIndex = pos;
    for (const operand of pe.operands) {
      const result = this.env.parse(operand, nextIndex);
      if (result == null) {
        return null;
      }
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeSequence(new Range(pos, nextIndex), values), nextIndex];
  }

  visitOrderedChoice(
    pe: OrderedChoice,
    pos: Position
  ): [IParseTree, Position] | null {
    let i = 0;
    for (const operand of pe.operands) {
      const result = this.env.parse(operand, pos);
      if (result != null) {
        const [value, nextIndex] = result;
        return [
          new NodeOrderedChoice(new Range(pos, nextIndex), value, i),
          nextIndex,
        ];
      }
      i++;
    }
    return null;
  }

  visitGrouping(pe: Grouping, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [new NodeGrouping(new Range(pos, nextIndex), childNode), nextIndex];
  }

  visitRewriting(pe: Rewriting, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [
      new NodeRewriting(new Range(pos, nextIndex), childNode, this),
      nextIndex,
    ];
  }

  visitColon(pe: Colon, pos: Position): [IParseTree, Position] | null {
    const lhsResult = this.env.parse(pe.lhs, pos);
    if (lhsResult == null) {
      return null;
    }
    const [_lhsValue, lhsNextIndex] = lhsResult;
    const rhsResult = this.env.parse(pe.rhs, pos);
    if (rhsResult == null) {
      return null;
    }
    const [_rhsValue, rhsNextIndex] = rhsResult;
    if (lhsNextIndex.offset != rhsNextIndex.offset) {
      return null;
    }
    return rhsResult;
  }

  visitColonNot(pe: ColonNot, pos: Position): [IParseTree, Position] | null {
    const lhsResult = this.env.parse(pe.lhs, pos);
    if (lhsResult == null) {
      return null;
    }
    const rhsResult = this.env.parse(pe.rhs, pos);
    if (rhsResult != null) {
      const [_lhsValue, lhsNextIndex] = lhsResult;
      const [_rhsValue, rhsNextIndex] = rhsResult;
      if (lhsNextIndex.offset == rhsNextIndex.offset) {
        return null;
      }
    }
    return lhsResult;
  }

  visitLake(pe: Lake, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.semantics, pos);
    assert(
      result != null,
      'Lake should not fail since it accepts an empty string'
    );
    const [childNode, nextIndex] = result;
    const zeroOrMore = childNode as NodeZeroOrMore;
    const islands = zeroOrMore.childNodes
      .map((group) => group.childNodes[0])
      .filter((childNode) => (childNode as NodeOrderedChoice).index == 0)
      .map((childNode) => (childNode as NodeOrderedChoice).childNodes[0]);
    return [new NodeLake(new Range(pos, nextIndex), islands, pe), nextIndex];
  }
}
