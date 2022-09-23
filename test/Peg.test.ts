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
});
