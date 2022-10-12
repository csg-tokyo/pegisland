import {
  And,
  Nonterminal,
  Not,
  NullParsingExpression,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rule,
  Sequence,
  Terminal,
  ZeroOrMore,
  Grouping,
  Lake,
  Colon,
  ColonNot,
} from '../src';
import { peToString } from '../src/Printer';

describe('Printer', () => {
  it('should print a Terminal', () => {
    const term = new Terminal(/./, 'dot');
    expect(peToString(term)).toEqual('dot');
  });
  it('should print a Nonterminal', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    expect(peToString(nonterminal)).toEqual('foo');
  });
  it('should print *', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const zeroOrMore = new ZeroOrMore(nonterminal);
    expect(peToString(zeroOrMore)).toEqual('foo*');
  });
  it('should print +', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const oneOrMore = new OneOrMore(nonterminal);
    expect(peToString(oneOrMore)).toEqual('foo+');
  });
  it('should print ?', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const optional = new Optional(nonterminal);
    expect(peToString(optional)).toEqual('foo?');
  });
  it('should print !', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const not = new Not(nonterminal);
    expect(peToString(not)).toEqual('!foo');
  });
  it('should print &', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const and = new And(nonterminal);
    expect(peToString(and)).toEqual('&foo');
  });
  it('should print a sequence', () => {
    const rule1 = new Rule('foo', new NullParsingExpression());
    const nonterminal1 = new Nonterminal(rule1);
    const rule2 = new Rule('bar', new NullParsingExpression());
    const nonterminal2 = new Nonterminal(rule2);
    const sequence = new Sequence([nonterminal1, nonterminal2]);
    expect(peToString(sequence)).toEqual('foo bar');
  });
  it('should print an ordered choice', () => {
    const rule1 = new Rule('foo', new NullParsingExpression());
    const nonterminal1 = new Nonterminal(rule1);
    const rule2 = new Rule('bar', new NullParsingExpression());
    const nonterminal2 = new Nonterminal(rule2);
    const choice = new OrderedChoice([nonterminal1, nonterminal2]);
    expect(peToString(choice)).toEqual('foo / bar');
  });
  it('should print ()', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const group = new Grouping(nonterminal);
    expect(peToString(group)).toEqual('( foo )');
  });
  it('should print <<>>', () => {
    const rule = new Rule('foo', new NullParsingExpression());
    const nonterminal = new Nonterminal(rule);
    const lake = new Lake(nonterminal);
    expect(peToString(lake)).toEqual('<< foo >>');
  });
  it('should print :', () => {
    const rule1 = new Rule('foo', new NullParsingExpression());
    const nonterminal1 = new Nonterminal(rule1);
    const rule2 = new Rule('bar', new NullParsingExpression());
    const nonterminal2 = new Nonterminal(rule2);
    const colon = new Colon(nonterminal1, nonterminal2);
    expect(peToString(colon)).toEqual('foo:bar');
  });
  it('should print :!', () => {
    const rule1 = new Rule('foo', new NullParsingExpression());
    const nonterminal1 = new Nonterminal(rule1);
    const rule2 = new Rule('bar', new NullParsingExpression());
    const nonterminal2 = new Nonterminal(rule2);
    const colonNot = new ColonNot(nonterminal1, nonterminal2);
    expect(peToString(colonNot)).toEqual('foo:!bar');
  });
});
