import assert from 'assert';
import { IParseTree } from '../ParseTree';
import { IParsingExpression, BaseParsingEnv } from '../ParsingExpression';
import { Rule } from '../Rule';
import { Position } from '../Position';

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
