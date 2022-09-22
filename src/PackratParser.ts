// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import assert from 'assert';
import lineColumn from 'line-column';
import { IParseTree } from './ParseTree';
import {
  Rule,
  Position,
  IParsingExpression,
  BaseParsingEnv,
} from './ParsingExpression';
import { peToString } from './Printer';

function makeErrorMessage(env: PackratParsingEnv) {
  const finder = lineColumn(env.s);
  const info = finder.fromIndex(env.maxIndex);
  if (info) {
    return [
      `Parsing error at offset line ${info.line} column ${info.col}.`,
      'when parsing with the following parsing expressions:',
      ...[...env.deepestStack.map(peToString)].reverse(),
    ].join('\n');
  }
  return `Parsing error at offset ${env.maxIndex}`;
}

export class ParsingError extends Error {
  constructor(public env: PackratParsingEnv) {
    super(makeErrorMessage(env));
  }
}

export class PackratParser {
  rules: Map<string, Rule>;

  constructor(nonterminals: Map<string, Rule>) {
    this.rules = nonterminals;
  }

  private getStartRule(startSymbol?: string): Rule | Error {
    let rule = this.rules.values().next().value;
    if (startSymbol) {
      if (this.rules.has(startSymbol)) {
        rule = this.rules.get(startSymbol);
      } else {
        return Error(
          `Nonterminal symbol {startSymbol} does not exist in the grammar.`
        );
      }
    }
    return rule;
  }

  public parse(
    s: string,
    startSymbol?: string
  ): IParseTree | ParsingError | Error {
    const rule = this.getStartRule(startSymbol);
    if (rule instanceof Error) {
      return rule;
    }
    const env = new PackratParsingEnv(s);
    const result = rule.parse(env, new Position(0, 1, 1));
    if (result == null) {
      return new ParsingError(env);
    }
    const [tree, nextPos] = result;
    if (nextPos.offset < s.length) {
      return new ParsingError(env);
    }
    return tree;
  }
}

export class PackratParsingEnv extends BaseParsingEnv {
  private currentStack: IParsingExpression[] = [];
  deepestStack: IParsingExpression[] = [];
  public maxIndex = 0;

  memo: Map<Rule, [IParseTree, Position] | null> = new Map();

  constructor(public s: string) {
    super();
  }

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    return rule.parse(this, pos);
    /*
    if (!this.memo.has(rule)) {
      const result = rule.parse(this, pos);
      this.memo.set(rule, result);
    }
    return this.memo.get(rule) as [IParseTree, Position] | null;
    */
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    this.currentStack.push(pe);
    if (pos.offset >= this.maxIndex) {
      this.maxIndex = pos.offset;
      this.deepestStack = [...this.currentStack];
    }
    const result = pe.accept(this.recognizer, pos);
    this.currentStack.pop();
    return result;
  }
}

class Head {
  constructor(
    public rule: Rule,
    public involvedSet: Set<Rule>,
    public evalSet: Set<Rule>
  ) {}
}
class LR {
  constructor(
    public seed: ParseResult | null,
    public rule: Rule,
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

export class PackratParsingEnv2 extends BaseParsingEnv {
  private currentStack: IParsingExpression[] = [];
  deepestStack: IParsingExpression[] = [];
  public maxIndex = 0;

  memo: { [name: number]: MemorEntry | null } = {};

  constructor(public s: string) {
    super();
  }

  glowLR(
    rule: Rule,
    pos: Position,
    m: MemorEntry,
    h: Head
  ): [IParseTree, Position] | null {
    heads.set(pos.offset, h); // A
    for (;;) {
      h.evalSet = new Set(h.involvedSet); // B
      const ans = rule.parseWithoutMemo(this, pos);
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
    rule: Rule,
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
        return this.glowLR(rule, pos, m, h);
      }
    }
  }

  recall(rule: Rule, pos: Position): MemorEntry | null {
    const m = this.memo[pos.offset];
    const h = heads.get(pos.offset);
    if (h == undefined) {
      return m;
    }
    if (m == null && rule != h.rule && !h.involvedSet.has(rule)) {
      return new MemorEntry(null);
    }
    if (h.evalSet.has(rule)) {
      h.evalSet.delete(rule);
      const ans = rule.parseWithoutMemo(this, pos);
      assert(m != null);
      m.ans = this.convertToParseResult(ans);
    }
    return m;
  }

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    const m = this.recall(rule, pos);
    if (m == null) {
      const lr = new LR(null, rule, null, LRStack);
      LRStack = lr;
      const m = new MemorEntry(lr);
      this.memo[pos.offset] = m;
      const ans = rule.parseWithoutMemo(this, pos);
      LRStack = LRStack.next;
      if (lr.head != null) {
        lr.seed = this.convertToParseResult(ans);
        return this.lrAnswer(rule, pos, m);
      } else {
        m.ans = this.convertToParseResult(ans);
        return ans;
      }
    } else {
      if (m.ans instanceof LR) {
        this.setUpLR(rule, m.ans);
        return this.convertFromParseResult(m.ans.seed);
      } else {
        return this.convertFromParseResult(m.ans);
      }
    }
  }

  setUpLR(rule: Rule, lr: LR): void {
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

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    this.currentStack.push(pe);
    if (pos.offset >= this.maxIndex) {
      this.maxIndex = pos.offset;
      this.deepestStack = [...this.currentStack];
    }
    const result = pe.accept(this.recognizer, pos);
    this.currentStack.pop();
    return result;
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
