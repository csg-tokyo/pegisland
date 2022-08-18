import { strict as assert } from 'assert';
import {
  Terminal,
  ZeroOrMore,
  OneOrMore,
  Optional,
  And,
  Not,
  Sequence,
  OrderedChoice,
  NullParsingExpression,
  Position,
  Rule,
} from '../src/ParsingExpression';
import {
  NodeTerminal,
  NodeZeroOrMore,
  NodeOneOrMore,
  NodeOptional,
  NodeAnd,
  NodeNot,
  NodeSequence,
  NodeOrderedChoice,
  NodeNonterminal,
} from '../src/ParseTree';
import { PackratParsingEnv } from '../src/PackratParser';

describe('NullParsingExpression', () => {
  describe('#parse()', () => {
    it('should always return null', () => {
      const nil = new NullParsingExpression();
      assert.equal(
        nil.parse(new PackratParsingEnv('abd'), new Position(1, -1, -1)),
        null
      );
    });
  });
});

describe('Terminal', () => {
  describe('#parse()', () => {
    const s = '1980/10/28';
    const term = new Terminal(/\d+/, "r'\\d+'");
    it('should consume digits from the beginning of a string', () => {
      const result = term.parse(
        new PackratParsingEnv(s),
        new Position(0, -1, -1)
      );
      assert(result);
      if (result != null) {
        const [leaf, pos] = result;
        assert(pos.offset == 4);
        assert(leaf.range.start.offset == 0);
        assert(leaf.range.end.offset == 4);
        assert(leaf instanceof NodeTerminal);
        if (leaf instanceof NodeTerminal) {
          assert(leaf.text == '1980');
        }
      }
    });
    it('should consume nothing if the pattern does not match', () => {
      const result = term.parse(
        new PackratParsingEnv(s),
        new Position(4, -1, -1)
      );
      assert(!result);
    });
    it('shoud consume digits from the middle of a string', () => {
      const result = term.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      assert(result);
      if (result) {
        const [leaf, pos] = result;
        assert(pos.offset == 7);
        assert(leaf.range.start.offset == 5);
        assert(leaf.range.end.offset == 7);
      }
    });
  });
});

describe('Nonterminal', () => {
  describe('#parse()', () => {
    const s = '1980/10/28';
    const term = new Terminal('\\d+', "r'\\d+'");
    const nonterm = new Rule('foo', term);
    it('should consume digits from the beginning of a string', () => {
      const result = nonterm.parse(
        new PackratParsingEnv(s),
        new Position(0, -1, -1)
      );
      assert(result);
      if (result != null) {
        const [node, pos] = result;
        assert(pos.offset == 4);
        assert(node.range.start.offset == 0);
        assert(node.range.end.offset == 4);
        assert(node instanceof NodeNonterminal);
        if (node instanceof NodeNonterminal) {
          assert(node.symbol == 'foo');
        }
      }
    });
    it('should consume nothing if the pattern does not match', () => {
      const result = nonterm.rhs.parse(
        new PackratParsingEnv(s),
        new Position(4, -1, -1)
      );
      assert(!result);
    });
    it('should consume nothing if the pattern does not match for the second time', () => {
      const result = nonterm.rhs.parse(
        new PackratParsingEnv(s),
        new Position(4, -1, -1)
      );
      assert(!result);
    });
  });
});

describe('ZeroOrMore', () => {
  const s = '01234ab123';
  const term = new Terminal('[a-z]', '[a-z]');
  const star = new ZeroOrMore(term);
  describe('#parse()', () => {
    it('should recognize empty string', () => {
      const result = star.parse(
        new PackratParsingEnv(s),
        new Position(s.length, -1, -1)
      );
      assert(result);
      if (result) {
        const [node, index] = result;
        assert(node instanceof NodeZeroOrMore);
        assert.equal(node.range.start.offset, s.length);
        assert.equal(node.range.end.offset, s.length);
        assert.equal(index.offset, s.length);
        if (node instanceof NodeZeroOrMore) {
          assert.equal(node.childNodes.length, 0);
        }
      }
    });
    it('should consume multiple prepetition of the pattern of the operand', () => {
      const result = star.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      if (result) {
        assert(result);
        const [node, pos] = result;
        assert(node instanceof NodeZeroOrMore);
        assert(node.range.start.offset == 5);
        assert(node.range.end.offset == 7);
        assert(pos.offset == 7);
        if (node instanceof NodeZeroOrMore) {
          assert.equal(node.childNodes.length, 2);
        }
      }
    });
  });
});

describe('OneOrMore', () => {
  const s = '01234ab123';
  const term = new Terminal('[a-z]', '[a-z]');
  const plus = new OneOrMore(term);
  describe('#parse()', () => {
    it('should not recognize empty string', () => {
      const result = plus.parse(
        new PackratParsingEnv(s),
        new Position(s.length, -1, -1)
      );
      assert.equal(result, null);
    });
    it('should consume multiple prepetition of the pattern of the operand', () => {
      const result = plus.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      if (result) {
        assert(result);
        const [node, pos] = result;
        assert(node instanceof NodeOneOrMore);
        assert(node.range.start.offset == 5);
        assert(node.range.end.offset == 7);
        assert(pos.offset == 7);
        if (node instanceof NodeOneOrMore) {
          assert.equal(node.childNodes.length, 2);
        }
      }
    });
  });
});

describe('Optional', () => {
  const s = '01234ab123';
  const term = new Terminal('[a-z]', '[a-z]');
  const opt = new Optional(term);
  describe('#parse()', () => {
    it('should recognize empty string', () => {
      const result = opt.parse(
        new PackratParsingEnv(s),
        new Position(s.length, -1, -1)
      );
      assert(result);
      if (result) {
        const [node, index] = result;
        assert(node instanceof NodeOptional);
        assert.equal(node.range.start.offset, s.length);
        assert.equal(node.range.end.offset, s.length);
        assert.equal(index.offset, s.length);
        if (node instanceof NodeOptional) {
          assert.equal(node.childNodes.length, 0);
        }
      }
    });
    it('should consume a string matching the pattern of the operand', () => {
      const result = opt.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      if (result) {
        assert(result);
        const [node, pos] = result;
        assert(node instanceof NodeOptional);
        assert(node.range.start.offset == 5);
        assert(node.range.end.offset == 6);
        assert(pos.offset == 6);
        if (node instanceof NodeOptional) {
          assert.equal(node.childNodes.length, 1);
        }
      }
    });
  });
});

describe('And', () => {
  const s = '01234ab123';
  const term = new Terminal('[a-z]', '[a-z]');
  const and = new And(term);
  describe('#parse()', () => {
    it('should return null if the pattern does not match', () => {
      const result = and.parse(
        new PackratParsingEnv(s),
        new Position(s.length, -1, -1)
      );
      assert.equal(result, null);
    });
    it('should not consume any input even if the pattern matches', () => {
      const result = and.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      if (result) {
        assert(result);
        const [node, pos] = result;
        assert(node instanceof NodeAnd);
        assert(node.range.start.offset == 5);
        assert(node.range.end.offset == 6);
        assert(pos.offset == 5);
        if (node instanceof NodeAnd) {
          assert.equal(node.childNodes.length, 1);
          assert.equal(node.range.start.offset, 5);
          assert.equal(node.range.end.offset, 6);
        }
      }
    });
  });
});

describe('Not', () => {
  const s = '01234ab123';
  const term = new Terminal('[a-z]', '[a-z]');
  const not = new Not(term);
  describe('#parse()', () => {
    it('should return null if the pattern matches', () => {
      const result = not.parse(
        new PackratParsingEnv(s),
        new Position(5, -1, -1)
      );
      assert.equal(result, null);
    });
    it('should not consume any input even when the pattern does not match', () => {
      const result = not.parse(
        new PackratParsingEnv(s),
        new Position(2, -1, -1)
      );
      if (result) {
        assert(result);
        const [node, pos] = result;
        assert(node instanceof NodeNot);
        assert(node.range.start.offset == 2);
        assert(node.range.end.offset == 2);
        assert(pos.offset == 2);
        if (node instanceof NodeNot) {
          assert.equal(node.childNodes.length, 0);
        }
      }
    });
  });
});

describe('Sequence', () => {
  const s = 'o1234ab123';
  const numbers = new Terminal('[0-9]+', "r'[0-9]+'");
  const letters = new Terminal('[a-z]+', "r'[a-z]+'");
  const seq = new Sequence([numbers, letters]);
  describe('#parse()', () => {
    it('should recognize the sequence of patterns', () => {
      const result = seq.parse(
        new PackratParsingEnv(s),
        new Position(1, -1, -1)
      );
      assert(result);
      if (result) {
        const [node, index] = result;
        assert.equal(index.offset, 'o1234ab'.length);
        assert(node instanceof NodeSequence);
        if (node instanceof NodeSequence) {
          assert.equal(node.range.start.offset, 1);
          assert.equal(node.range.end.offset, 'o1234ab'.length);
          assert.equal(node.childNodes.length, 2);
        }
      }
    });
    it('should return null if the sequence does not match', () => {
      const result = seq.parse(
        new PackratParsingEnv(s),
        new Position(7, -1, -1)
      );
      assert.equal(result, null);
    });
  });
});

describe('OrderedChoice', () => {
  const s = 'o1234ab789';
  const numbers = new Terminal('[0-9]+', "r'[0-9]+'");
  const letters = new Terminal('[a-z]+', "r'[a-z]+'");
  const choice = new OrderedChoice([numbers, letters]);
  describe('#parse()', () => {
    it('should recognize the first pattern', () => {
      const result = choice.parse(
        new PackratParsingEnv(s),
        new Position(1, -1, -1)
      );
      assert(result);
      if (result) {
        const [node, index] = result;
        assert.equal(index.offset, 'o1234'.length);
        assert(node instanceof NodeOrderedChoice);
        if (node instanceof NodeOrderedChoice) {
          assert.equal(node.range.start.offset, 1);
          assert.equal(node.range.end.offset, 'o1234'.length);
          assert.equal(node.index, 0);
        }
      }
    });

    it('should recognize the last pattern', () => {
      const result = choice.parse(
        new PackratParsingEnv(s),
        new Position('o1234'.length, -1, -1)
      );
      assert(result);
      if (result) {
        const [node, index] = result;
        assert.equal(index.offset, 'o1234ab'.length);
        assert(node instanceof NodeOrderedChoice);
        if (node instanceof NodeOrderedChoice) {
          assert.equal(node.range.start.offset, 'o1234'.length);
          assert.equal(node.range.end.offset, 'o1234ab'.length);
          assert.equal(node.index, 1);
        }
      }
    });

    it('should return null if no pattern matches', () => {
      const result = choice.parse(
        new PackratParsingEnv(s),
        new Position('o1234ab789'.length, -1, -1)
      );
      assert.equal(result, null);
    });
  });
});
