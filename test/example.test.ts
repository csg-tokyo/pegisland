import { strict as assert } from 'assert';
import { exampleGrammar, exampleSource } from '../src/example';
import { Parser, parseGrammar } from '../src/Parser';
import { Peg } from '../src/Peg';
import { processLakes } from '../src/lake';
import { IParseTree } from '../src/ParseTree';

describe('Example grammar', () => {
  describe('#parseGrammar', () => {
    it('should process a nonterminal and a terminal', () => {
      const peg = parseGrammar(exampleGrammar);
      assert(peg instanceof Peg);
      processLakes(peg);
      const parser = new Parser(peg);
      const result = parser.parse(exampleSource);
      assert(result as IParseTree);
    });
  });
});
