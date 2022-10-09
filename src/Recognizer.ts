// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
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
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { IParsingEnv } from './IParsingEnv';
import { Position } from './Position';

export class Recognizer
  implements
    IParsingExpressionVisitor<[Position], [IParseTree, Position] | null>
{
  constructor(private env: IParsingEnv) {}

  visitNonterminal(
    pe: Nonterminal,
    pos: Position
  ): [IParseTree, Position] | null {
    const result = this.env.parseRule(pe.rule, pos);
    if (result === null || pe.name === '') {
      return result;
    }
    const [, end] = result;
    const value = this.env.s.substring(pos.offset, end.offset).trim();
    if (!this.env.has(pe.name)) {
      this.env.register(pe.name, value);
    } else if (value !== this.env.lookup(pe.name)) {
      return null;
    }

    return result;
  }

  visitTerminal(pe: Terminal, pos: Position): [IParseTree, Position] | null {
    pe.regex.lastIndex = pos.offset;
    const m = this.env.s.match(pe.regex);
    if (m === null) {
      return null;
    }
    const [text] = m;
    const { length } = text;
    const nextOffset = pos.offset + length;
    const lines = text.split('\n');
    const baseCol = lines.length === 1 ? pos.column : 1;
    const nextPos = new Position(
      nextOffset,
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
    let prevPos = null;
    let nextPos = pos;
    while (nextPos !== prevPos) {
      prevPos = nextPos;
      const result = this.env.parse(pe.operand, nextPos);
      if (!result) {
        break;
      }
      const [value] = result;
      [, nextPos] = result;
      values.push(value);
    }
    return [new NodeZeroOrMore(new Range(pos, nextPos), values), nextPos];
  }

  visitOneOrMore(pe: OneOrMore, pos: Position): [IParseTree, Position] | null {
    let prevPos = pos;
    const result = this.env.parse(pe.operand, pos);
    if (!result) {
      return null;
    }
    let [value, nextPos] = result;
    const values: IParseTree[] = [value];
    while (nextPos !== prevPos) {
      prevPos = nextPos;
      const result = this.env.parse(pe.operand, nextPos);
      if (!result) {
        break;
      }
      [value, nextPos] = result;
      values.push(value);
    }
    return [new NodeOneOrMore(new Range(pos, nextPos), values), nextPos];
  }

  visitOptional(pe: Optional, pos: Position): [IParseTree, Position] | null {
    const values: IParseTree[] = [];
    let nextPos = pos;
    const result = this.env.parse(pe.operand, nextPos);
    if (result) {
      const [value] = result;
      [, nextPos] = result;
      values.push(value);
    }
    return [new NodeOptional(new Range(pos, nextPos), values), nextPos];
  }

  visitAnd(pe: And, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result === null) {
      return null;
    }
    const [value, nextPos] = result;
    return [new NodeAnd(new Range(pos, nextPos), value), pos];
  }

  visitNot(pe: Not, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result !== null) {
      return null;
    }
    return [new NodeNot(new Range(pos, pos)), pos];
  }

  visitSequence(pe: Sequence, pos: Position): [IParseTree, Position] | null {
    const values = [];
    let nextPos = pos;
    for (const operand of pe.operands) {
      const result = this.env.parse(operand, nextPos);
      if (result === null) {
        return null;
      }
      const [value] = result;
      [, nextPos] = result;
      values.push(value);
    }
    return [new NodeSequence(new Range(pos, nextPos), values), nextPos];
  }

  visitOrderedChoice(
    pe: OrderedChoice,
    pos: Position
  ): [IParseTree, Position] | null {
    for (let i = 0; i < pe.operands.length; i++) {
      const result = this.env.parse(pe.operands[i], pos);
      if (result !== null) {
        const [value, nextPos] = result;
        return [
          new NodeOrderedChoice(new Range(pos, nextPos), value, i),
          nextPos,
        ];
      }
    }
    return null;
  }

  visitGrouping(pe: Grouping, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result === null) {
      return null;
    }
    const [childNode, nextPos] = result;
    return [new NodeGrouping(new Range(pos, nextPos), childNode), nextPos];
  }

  visitRewriting(pe: Rewriting, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.operand, pos);
    if (result === null) {
      return null;
    }
    const [childNode, nextPos] = result;
    return [
      new NodeRewriting(new Range(pos, nextPos), childNode, this),
      nextPos,
    ];
  }

  visitColon(pe: Colon, pos: Position): [IParseTree, Position] | null {
    const lhsResult = this.env.parse(pe.lhs, pos);
    if (lhsResult === null) {
      return null;
    }
    const [, lhsNextPos] = lhsResult;
    const rhsResult = this.env.parse(pe.rhs, pos);
    if (rhsResult === null) {
      return null;
    }
    const [, rhsNextPos] = rhsResult;
    if (lhsNextPos.offset !== rhsNextPos.offset) {
      return null;
    }
    return rhsResult;
  }

  visitColonNot(pe: ColonNot, pos: Position): [IParseTree, Position] | null {
    const lhsResult = this.env.parse(pe.lhs, pos);
    if (lhsResult === null) {
      return null;
    }
    const rhsResult = this.env.parse(pe.rhs, pos);
    if (rhsResult !== null) {
      const [, lhsNextPos] = lhsResult;
      const [, rhsNextPos] = rhsResult;
      if (lhsNextPos.offset === rhsNextPos.offset) {
        return null;
      }
    }
    return lhsResult;
  }

  visitLake(pe: Lake, pos: Position): [IParseTree, Position] | null {
    const result = this.env.parse(pe.semantics, pos);
    assert(
      result !== null,
      'Lake should not fail since it accepts an empty string'
    );
    const [childNode, nextPos] = result;
    const zeroOrMore = childNode as NodeZeroOrMore;
    const islands = zeroOrMore.childNodes
      .map((group) => group.childNodes[0])
      .filter((childNode) => (childNode as NodeOrderedChoice).index === 0)
      .map((childNode) => (childNode as NodeOrderedChoice).childNodes[0]);
    return [new NodeLake(new Range(pos, nextPos), islands, pe), nextPos];
  }
}
