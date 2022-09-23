import { parseGrammar } from '../src';

describe('Peg', () => {
  it('should print a grammar', () => {
    const grammar = `@water foo <- 'a' 'b' / ('c' / 'd')* bar <- "e" r'f'`;
    const peg = parseGrammar(grammar);
    const output = `@water
foo <- 
    'a' 'b' /
    ( 'c' / 'd' )*
bar <- "e" r'f'`;
    expect(peg.toString()).toEqual(output);
  });
  it('should print a grammar with a rule-less lake symbol', () => {
    const grammar = `foo <- <lake>*`;
    const peg = parseGrammar(grammar);
    const output = `foo <- <lake>*`;
    expect(peg.toString()).toEqual(output);
  });
});
