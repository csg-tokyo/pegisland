import assert from 'assert';
import { expect } from '@jest/globals';
import fs from 'fs';
import { parseGrammar, Peg } from '../src';
import { PikaParser } from '../src/PikaParser';

describe('PikaParser', () => {
  describe('#parse()', () => {
    it('should work with a left recursive grammar', () => {
      const grammar = `
        program <- (x / y)*
        x <- program [a-b] / [a-b]
        y <- program [0-9] / [0-9]
        `;
      const parser = new PikaParser(parseGrammar(grammar) as Peg);
      const s = 'aba012b0a';
      if (!(parser instanceof Error)) {
        const result = parser.parse(s, 'program');
        assert(!(result instanceof Error));
        expect(result.range.end.offset).toEqual(s.length);
      }
    });
    it('should handle various operators', () => {
      const grammar = `
        Compilation <- Word:While -> "a"
        Word <- r'\\w+'
        While <- 'while'
        `;
      const peg = parseGrammar(grammar);
      assert(peg instanceof Peg);
      const parser = new PikaParser(peg);
      const s = `while`;
      const result = parser.parse(s, 'Compilation');
      assert(!(result instanceof Error));
      expect(result.range.end.offset).toEqual(s.length);
    });
    it('should handle the Java grammar', () => {
      const grammar = fs
        .readFileSync('./grammar/java/full/Java.18.peg')
        .toString();
      const parser = new PikaParser(parseGrammar(grammar) as Peg);
      const s = `class Foo { int main() { foo(); } }`;
      const result = parser.parse(s, 'Compilation');
      assert(!(result instanceof Error));
      expect(result.range.end.offset).toEqual(s.length);
    });
  });
});
