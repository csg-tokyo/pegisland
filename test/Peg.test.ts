import {
  Nonterminal,
  NullParsingExpression,
  parseGrammar,
  Peg,
  Rule,
  Terminal,
} from '../src';
import { peToString } from '../src/Printer';

describe('Peg', () => {
  it('should print a grammar', () => {
    const grammar = `@water foo <- 'a' 'b' / ('c' / 'd')* bar <- "e" r'f'`;
    const peg = parseGrammar(grammar);
    console.log(peg.toString());
    const output = `@water
foo <- 
    'a' 'b' /
    ( 'c' / 'd' )*
bar <- "e" r'f'`;
    expect(peg.toString()).toEqual(output);
  });
});
