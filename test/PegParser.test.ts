import { strict as assert } from 'assert';
import fs from 'fs';
import { PegParser } from '../src/PegParser';
import { NodeNonterminal } from '../src/ParseTree';
import { ParsingError } from '../src/PackratParser';

describe('PegParser', () => {
  const parser = new PegParser();
  describe('#parse()', () => {
    it('should recognize the grammar for Java', () => {
      const s = fs.readFileSync('grammar/java/full/Java.18.peg').toString();
      const result = parser.parse(s);
      assert(result instanceof NodeNonterminal);
    });

    it('should recognize a grammar written in PEG', () => {
      const s = `
foo <- "1234" &bar+ (bar bar . [123] . _ r"123") // 123
bar  // comment
<- "1234"
baz <- / a
`;
      const result = parser.parse(s);
      assert(result instanceof NodeNonterminal);
      if (result instanceof NodeNonterminal) {
        assert.equal(result.range.start.offset, 0);
        assert.equal(result.range.end.offset, s.length);
      }
    });

    it('should recognize a grammar written in PEG', () => {
      const s = `
foo < "1234" 

`;
      const result = parser.parse(s);
      assert(result instanceof ParsingError);
      assert.equal(result.env.maxIndex, 5);
    });
  });
});
