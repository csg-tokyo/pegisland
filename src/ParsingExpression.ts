// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import { InitialPegBuilder } from './InitialPegBuilder';
import { Parser } from './Parser';
import {
  IParseTree,
  NodeNonterminal,
  NodeOneOrMore,
  NodeZeroOrMore,
  NodeOptional,
  NodeTerminal,
  NodeAnd,
  NodeNot,
  NodeSequence,
  NodeOrderedChoice,
  NodeGrouping,
  NodeRewriting,
  Range,
} from './ParseTree';
import { Peg } from './Peg';

export class Position {
  constructor(
    public offset: number,
    public line: number,
    public column: number
  ) {}
  equal(other: Position): boolean {
    return (
      this.offset == other.offset &&
      this.line == other.line &&
      this.column == other.column
    );
  }
}

export interface IParsingExpressionVisitor {
  visitNonterminal(pe: Nonterminal): void;
  visitTerminal(pe: Terminal): void;
  visitZeroOrMore(pe: ZeroOrMore): void;
  visitOneOrMore(pe: OneOrMore): void;
  visitOptional(pe: Optional): void;
  visitAnd(pe: And): void;
  visitNot(pe: Not): void;
  visitSequence(pe: Sequence): void;
  visitOrderedChoice(pe: OrderedChoice): void;
  visitGrouping(pe: Grouping): void;
  visitRewriting(pe: Rewriting): void;
  visitColon(pe: Colon): void;
  visitColonNot(pe: ColonNot): void;
}

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
}

class BaseRule {
  constructor(public symbol: string, public rhs: IParsingExpression) {}

  parseWithoutMemo(
    env: IParsingEnv,
    pos: Position
  ): [IParseTree, Position] | null {
    env.push();
    const result = env.parse(this.rhs, pos);
    env.pop();
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [
      new NodeNonterminal(this.symbol, new Range(pos, nextIndex), childNode),
      nextIndex,
    ];
  }
}

/*
class LR {
  constructor(public detected: boolean) {}
}

// Section 3.2
export class Rule extends BaseRule {
  memo: { [name: number]: [IParseTree, Position] | LR | null } = {};
  constructor(symbol: string, rhs: IParsingExpression) {
    super(symbol, rhs);
  }

  glowLR(
    env: IParsingEnv,
    pos: Position,
    nextPos: Position
  ): [IParseTree, Position] | null {
    while (true) {
      const ans = this.parseWithoutMemo(env, pos);
      if (ans == null) {
        break;
      }
      const [_tree, newNextPos] = ans;
      if (newNextPos.offset <= nextPos.offset) {
        break;
      }
      nextPos = newNextPos;
      this.memo[pos.offset] = ans;
    }
    return this.memo[pos.offset] as [IParseTree, Position] | null;
  }

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    if (pos.offset in this.memo == false) {
      const lr = new LR(false);
      this.memo[pos.offset] = lr;
      const ans = this.parseWithoutMemo(env, pos);
      this.memo[pos.offset] = ans;
      if (lr.detected && ans != null) {
        const [_tree, nextPos] = ans;
        return this.glowLR(env, pos, nextPos);
      } else {
        return ans;
      }
    } else {
      const m = this.memo[pos.offset];
      if (m instanceof LR) {
        m.detected = true;
        return null;
      } else {
        return m;
      }
    }
  }
}
*/

class Head {
  constructor(
    public rule: BaseRule,
    public involvedSet: Set<BaseRule>,
    public evalSet: Set<BaseRule>
  ) {}
}
class LR {
  constructor(
    public seed: ParseResult | null,
    public rule: BaseRule,
    public head: Head | null = null,
    public next: LR | null = null
  ) {}
}

let LRStack: LR | null = null;
const heads: Map<number, Head> = new Map();

class ParseResult {
  constructor(public tree: IParseTree, public nextPos: Position) {}
}

class MemorEntry {
  constructor(public ans: ParseResult | LR | null) {}
}

export class Rule extends BaseRule {
  memo: { [name: number]: MemorEntry | null } = {};
  constructor(symbol: string, rhs: IParsingExpression) {
    super(symbol, rhs);
  }

  glowLR(
    env: IParsingEnv,
    pos: Position,
    m: MemorEntry,
    h: Head
  ): [IParseTree, Position] | null {
    heads.set(pos.offset, h); // A
    while (true) {
      h.evalSet = new Set(h.involvedSet); // B
      const ans = this.parseWithoutMemo(env, pos);
      if (ans == null) {
        break;
      }
      const [_, nextPos] = ans;
      assert(m.ans instanceof ParseResult);
      if (nextPos.offset <= m.ans.nextPos.offset) {
        break;
      }
      m.ans = this.convertToParseResult(ans);
    }
    heads.delete(pos.offset); // C
    assert(m.ans != null);
    assert(!(m.ans instanceof LR));
    return this.convertFromParseResult(m.ans);
  }

  convertFromParseResult(
    ans: ParseResult | null
  ): [IParseTree, Position] | null {
    if (ans == null) {
      return null;
    }
    const { tree, nextPos } = ans;
    return [tree, nextPos];
  }
  convertToParseResult(ans: [IParseTree, Position] | null): ParseResult | null {
    if (ans == null) {
      return null;
    }
    const [tree, nextPos] = ans;
    return new ParseResult(tree, nextPos);
  }

  lrAnswer(
    env: IParsingEnv,
    rule: BaseRule,
    pos: Position,
    m: MemorEntry
  ): [IParseTree, Position] | null {
    assert(m.ans instanceof LR);
    const h = m.ans.head;
    assert(h != null);
    if (h.rule != rule) {
      return this.convertFromParseResult(m.ans.seed);
    } else {
      m.ans = m.ans.seed;
      if (m.ans == null) {
        return null;
      } else {
        return this.glowLR(env, pos, m, h);
      }
    }
  }

  recall(env: IParsingEnv, pos: Position): MemorEntry | null {
    let m = this.memo[pos.offset];
    let h = heads.get(pos.offset);
    if (h == undefined) {
      return m;
    }
    if (m == null && (this == h.rule || h.involvedSet.has(this))) {
      return new MemorEntry(null);
    }
    if (h.evalSet.has(this)) {
      h.evalSet.delete(this);
      let ans = this.parseWithoutMemo(env, pos);
      assert(m != null);
      m.ans = this.convertToParseResult(ans);
    }
    return m;
  }

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    let m = this.recall(env, pos);
    if (m == null) {
      const lr = new LR(null, this, null, LRStack);
      LRStack = lr;
      const m = new MemorEntry(lr);
      this.memo[pos.offset] = m;
      const ans = this.parseWithoutMemo(env, pos);
      LRStack = LRStack.next;
      if (lr.head != null) {
        lr.seed = this.convertToParseResult(ans);
        return this.lrAnswer(env, this, pos, m);
      } else {
        m.ans = this.convertToParseResult(ans);
        return ans;
      }
    } else {
      if (m.ans instanceof LR) {
        this.setUpLR(this, m.ans);
        return this.convertFromParseResult(m.ans.seed);
      } else {
        return this.convertFromParseResult(m.ans);
      }
    }
  }

  setUpLR(rule: BaseRule, lr: LR) {
    if (lr.head == null) {
      lr.head = new Head(rule, new Set(), new Set());
    }
    assert(LRStack instanceof LR);
    let s = LRStack;
    while (s.head != lr.head) {
      s.head = lr.head;
      lr.head.involvedSet.add(s.rule);
      assert(s.next != null);
      s = s.next;
    }
  }
}

export interface IParsingEnv {
  s: string;
  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null;
  push(): void;
  pop(): void;
  has(name: string): boolean;
  lookup(name: string): string;
  register(name: string, value: string): void;
}

export abstract class BaseParsingEnv implements IParsingEnv {
  abstract s: string;
  private symbolStack: { [name: string]: string }[] = [];
  push(): void {
    this.symbolStack.push({});
  }
  pop(): void {
    this.symbolStack.pop();
  }
  has(name: string): boolean {
    return name in this.symbolStack[this.symbolStack.length - 1];
  }
  lookup(name: string): string {
    return this.symbolStack[this.symbolStack.length - 1][name];
  }
  register(name: string, value: string): void {
    this.symbolStack[this.symbolStack.length - 1][name] = value;
  }

  abstract parse(
    pe: IParsingExpression,
    pos: Position
  ): [IParseTree, Position] | null;
}

export class ParsingEnvPlayer extends BaseParsingEnv {
  private currentStack: IParsingExpression[] = [];
  constructor(
    public s: string,
    public deepestStack: IParsingExpression[],
    public maxIndex: number
  ) {
    super();
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    this.currentStack.push(pe);
    if (pos.offset >= this.maxIndex) {
      this.maxIndex = pos.offset;
    }
    const result = pe.parse(this, pos);
    this.currentStack.pop();
    return result;
  }
}

export class ParsingEnv extends BaseParsingEnv {
  private currentStack: IParsingExpression[] = [];
  deepestStack: IParsingExpression[] = [];
  public maxIndex = 0;
  constructor(public s: string) {
    super();
  }
  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    this.currentStack.push(pe);
    if (pos.offset >= this.maxIndex) {
      this.maxIndex = pos.offset;
      this.deepestStack = [...this.currentStack];
    }
    const result = pe.parse(this, pos);
    this.currentStack.pop();
    return result;
  }
}

export interface IParsingExpression {
  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null;
  accept(visitor: IParsingExpressionVisitor): void;
}

export class NullParsingExpression implements IParsingExpression {
  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    return null;
  }
  accept(visitor: IParsingExpressionVisitor): void {
    assert(visitor);
  }
}

export class Nonterminal implements IParsingExpression {
  rule: Rule;
  name: string;
  constructor(rule: Rule, name: string = '') {
    this.rule = rule;
    this.name = name;
  }

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const result = this.rule.parse(env, pos);
    if (this.name == '') {
      return result;
    }
    if (result == null) {
      return result;
    }
    const [_, end] = result;
    const value = env.s.substr(pos.offset, end.offset - pos.offset).trim();
    if (!env.has(this.name)) {
      env.register(this.name, value);
    } else {
      if (value != env.lookup(this.name)) {
        return null;
      }
    }
    return result;
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitNonterminal(this);
  }
}

export class Terminal implements IParsingExpression {
  regex: RegExp;
  source: string;
  constructor(pattern: string | RegExp, source: string) {
    if (pattern instanceof RegExp) {
      this.regex = new RegExp(pattern.source, 'smy');
    } else {
      this.regex = new RegExp(pattern, 'smy');
    }
    this.source = source;
  }

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    this.regex.lastIndex = pos.offset;
    const m = env.s.match(this.regex);
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
    return [
      new NodeTerminal(new Range(pos, nextPos), this.regex, text),
      nextPos,
    ];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitTerminal(this);
  }
}

export class ZeroOrMore implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  parse(env: IParsingEnv, index: Position): [IParseTree, Position] | null {
    const start = index;
    const values: IParseTree[] = [];
    let prevIndex = null;
    let nextIndex = index;
    while (nextIndex != prevIndex) {
      prevIndex = nextIndex;
      const result = env.parse(this.operand, nextIndex);
      if (!result) {
        break;
      }
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeZeroOrMore(new Range(start, nextIndex), values), nextIndex];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitZeroOrMore(this);
  }
}

export class OneOrMore implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const start = pos;
    let prevIndex = pos;
    const result = env.parse(this.operand, pos);
    if (!result) {
      return null;
    }
    let [value, nextIndex] = result;
    const values: IParseTree[] = [value];
    while (nextIndex != prevIndex) {
      prevIndex = nextIndex;
      const result = env.parse(this.operand, nextIndex);
      if (!result) {
        break;
      }
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeOneOrMore(new Range(start, nextIndex), values), nextIndex];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitOneOrMore(this);
  }
}

export class Optional implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const start = pos;
    const values: IParseTree[] = [];
    let nextIndex = pos;
    const result = env.parse(this.operand, nextIndex);
    if (result) {
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeOptional(new Range(start, nextIndex), values), nextIndex];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitOptional(this);
  }
}

export class And implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const start = pos;
    const result = env.parse(this.operand, pos);
    if (result == null) {
      return null;
    }
    const [value, nextIndex] = result;
    return [new NodeAnd(new Range(start, nextIndex), value), start];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitAnd(this);
  }
}

export class Not implements IParsingExpression {
  operand: IParsingExpression;
  constructor(operand: IParsingExpression) {
    this.operand = operand;
  }

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const result = env.parse(this.operand, pos);
    if (result != null) {
      return null;
    }
    return [new NodeNot(new Range(pos, pos)), pos];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitNot(this);
  }
}

export class Colon implements IParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const lhsResult = env.parse(this.lhs, pos);
    if (lhsResult == null) {
      return null;
    }
    const [_lhsValue, lhsNextIndex] = lhsResult;
    const rhsResult = env.parse(this.rhs, pos);
    if (rhsResult == null) {
      return null;
    }
    const [_rhsValue, rhsNextIndex] = rhsResult;
    if (!lhsNextIndex.equal(rhsNextIndex)) {
      return null;
    }
    return rhsResult;
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitColon(this);
  }
}

export class ColonNot implements IParsingExpression {
  constructor(public lhs: IParsingExpression, public rhs: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const lhsResult = env.parse(this.lhs, pos);
    if (lhsResult == null) {
      return null;
    }
    const rhsResult = env.parse(this.rhs, pos);
    if (rhsResult != null) {
      const [_lhsValue, lhsNextIndex] = lhsResult;
      const [_rhsValue, rhsNextIndex] = rhsResult;
      if (lhsNextIndex.equal(rhsNextIndex)) {
        return null;
      }
    }
    return lhsResult;
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitColonNot(this);
  }
}

export class Sequence implements IParsingExpression {
  constructor(public operands: IParsingExpression[]) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const start = pos;
    const values = [];
    let nextIndex = pos;
    for (const operand of this.operands) {
      const result = env.parse(operand, nextIndex);
      if (result == null) {
        return null;
      }
      let value;
      [value, nextIndex] = result;
      values.push(value);
    }
    return [new NodeSequence(new Range(start, nextIndex), values), nextIndex];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitSequence(this);
  }
}

export class OrderedChoice implements IParsingExpression {
  constructor(public operands: IParsingExpression[]) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    let i = 0;
    for (const operand of this.operands) {
      const result = env.parse(operand, pos);
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

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitOrderedChoice(this);
  }
}

export class Grouping implements IParsingExpression {
  constructor(public operand: IParsingExpression) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const result = env.parse(this.operand, pos);
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [new NodeGrouping(new Range(pos, nextIndex), childNode), nextIndex];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitGrouping(this);
  }
}

export class Rewriting implements IParsingExpression {
  constructor(public operand: IParsingExpression, public spec: string) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    const result = env.parse(this.operand, pos);
    if (result == null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [
      new NodeRewriting(new Range(pos, nextIndex), childNode, this),
      nextIndex,
    ];
  }

  accept(visitor: IParsingExpressionVisitor): void {
    visitor.visitRewriting(this);
  }
}

function expressionToString(pe: IParsingExpression, level: number): string {
  if (pe instanceof Nonterminal) {
    return pe.rule.symbol;
  } else if (pe instanceof Terminal) {
    return pe.regex.source;
  } else if (pe instanceof ZeroOrMore) {
    return expressionToString(pe.operand, level + 1) + '*';
  } else if (pe instanceof OneOrMore) {
    return expressionToString(pe.operand, level + 1) + '+';
  } else if (pe instanceof Optional) {
    return expressionToString(pe.operand, level + 1) + '?';
  } else if (pe instanceof Not) {
    return '!' + expressionToString(pe.operand, level + 1);
  } else if (pe instanceof And) {
    return '&' + expressionToString(pe.operand, level + 1);
  } else if (pe instanceof Sequence) {
    return pe.operands
      .map((operand) => expressionToString(operand, level + 1))
      .join(' ');
  } else if (pe instanceof OrderedChoice) {
    if (level > 0) {
      return pe.operands
        .map((operand) => expressionToString(operand, level + 1))
        .join(' / ');
    } else {
      return (
        '\n' +
        pe.operands
          .map((operand) => expressionToString(operand, level + 1))
          .map((s) => '    ' + s)
          .join(' /\n')
      );
    }
  } else if (pe instanceof Grouping) {
    return '(' + expressionToString(pe.operand, level + 1) + ')';
  } else if (pe instanceof Rewriting) {
    return expressionToString(pe.operand, level + 1) + ' => ' + pe.spec;
  } else {
    assert(false);
  }
}

function ruleToString(rule: Rule) {
  return rule.symbol + ' <- ' + expressionToString(rule.rhs, 0);
}

export function pegToString(peg: Peg): string {
  return Array.from(peg.rules.values()).map(ruleToString).join('\n');
}
