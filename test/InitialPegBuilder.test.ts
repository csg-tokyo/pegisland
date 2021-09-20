import { strict as assert } from 'assert';
import { InitialPegBuilder } from '../src/InitialPegBuilder';
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
  Nonterminal,
  Rule,
} from '../src/ParsingExpression';

describe('IntialPegBuilder', () => {
  const builder = new InitialPegBuilder();
  describe('#doit()', () => {
    it('should process a nonterminal and a terminal', () => {
      builder.build({ foo: ['terminal', '123'] });
      const rule = builder.rules.get('foo') as Rule;
      assert.equal(rule.symbol, 'foo');
      const terminal = rule.rhs as Terminal;
      assert(terminal.regex.source, '123');
    });
    it('should process * operator', () => {
      builder.build({ foo: ['*', 'foo'] });
      const rule = builder.rules.get('foo') as Rule;
      const star = rule.rhs as ZeroOrMore;
      assert(star.operand instanceof Nonterminal);
    });
    it('should process + operator', () => {
      builder.build({ foo: ['+', 'foo'] });
      const rule = builder.rules.get('foo') as Rule;
      const plus = rule.rhs as OneOrMore;
      assert(plus.operand instanceof Nonterminal);
    });
    it('should process ? operator', () => {
      builder.build({ foo: ['?', 'foo'] });
      const rule = builder.rules.get('foo') as Rule;
      const opt = rule.rhs as Optional;
      assert(opt.operand instanceof Nonterminal);
    });
    it('should process & operator', () => {
      builder.build({ foo: ['&', 'foo'] });
      const rule = builder.rules.get('foo') as Rule;
      const and = rule.rhs as And;
      assert(and.operand instanceof Nonterminal);
    });
    it('should process ! operator', () => {
      builder.build({ foo: ['!', 'foo'] });
      const rule = builder.rules.get('foo') as Rule;
      const not = rule.rhs as Not;
      assert(not.operand instanceof Nonterminal);
    });
    it('should process a sequence operator', () => {
      builder.build({ foo: ['', 'foo', ['terminal', 'x']] });
      const rule = builder.rules.get('foo') as Rule;
      const seq = rule.rhs as Sequence;
      assert(seq.operands[0] instanceof Nonterminal);
      assert(seq.operands[1] instanceof Terminal);
    });
    it('should process / operator', () => {
      builder.build({ foo: ['/', 'foo', ['terminal', 'x']] });
      const rule = builder.rules.get('foo') as Rule;
      const choice = rule.rhs as OrderedChoice;
      assert(choice.operands[0] instanceof Nonterminal);
      assert(choice.operands[1] instanceof Terminal);
    });
    it('should return an instance of NullParsingExpression', () => {
      builder.build({ foo: ['unknown'] });
      const rule = builder.rules.get('foo') as Rule;
      const nil = rule.rhs as NullParsingExpression;
      assert(nil instanceof NullParsingExpression);
    });
  });
});
