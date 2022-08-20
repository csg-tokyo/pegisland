import { assert } from 'chai';
import fs from 'fs';
import { parseGrammar, Peg } from '../src';
import { BottomUpParser } from '../src/BottomUpParser';

describe('BottomUpParser', () => {
  describe('#parse()', () => {
    it('should work with a left recursive grammar', () => {
      const grammar = `
        program <- (x / y)*
        x <- program [a-b] / [a-b]
        y <- program [0-9] / [0-9]
        `;
      const parser = new BottomUpParser(parseGrammar(grammar) as Peg);
      const s = 'aba012b0a';
      if (!(parser instanceof Error)) {
        const result = parser.parse(s, 'program');
        assert(!(result instanceof Error));
        assert.equal(result.range.end.offset, s.length);
      }
    });
    it("should handle Mouse's operators", () => {
      const grammar = `
        Compilation <- Word:While
        Word <- r'\\w+'
        While <- 'while'
        `;
      const parser = new BottomUpParser(parseGrammar(grammar) as Peg);
      const s = `while`;
      const result = parser.parse(s, 'Compilation');
      assert(!(result instanceof Error));
      assert.equal(result.range.end.offset, s.length);
    });
    it('should handle the Java grammar', () => {
      const grammar = fs
        .readFileSync('./grammar/java/full/Java.18.peg')
        .toString();
      const parser = new BottomUpParser(parseGrammar(grammar) as Peg);
      const s = `class A{}`;
      const result = parser.parse(s, 'Compilation');
      //console.log(result);
      assert(!(result instanceof Error));
      assert.equal(result.range.end.offset, s.length);
    });
  });
});
