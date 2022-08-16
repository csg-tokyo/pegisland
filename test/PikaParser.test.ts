import { assert } from 'chai';
import fs from 'fs';
import {
  IParseTree,
  NodeNonterminal,
  NodeSequence,
  parseGrammar,
  ParsingError,
  Peg,
} from '../src';
import { printTree } from '../src/ParseTree';
import { PikaParser } from '../src/PikaParser';

describe('PikaParser', () => {
  describe('#parse()', () => {
    it('should work with a left recursive grammar', () => {
      const grammar = `
        program <- (x / y)*
        x <- program [a-b] / [a-b]
        y <- program [0-9] / [0-9]
        `;
      const parser = new PikaParser(parseGrammar(grammar) as Peg, 'program');
      const s = 'aba012b0a';
      const result = parser.parse(s);
      assert(result);
      assert.equal(result[1].offset, s.length);
    });
    it("should handle Mouse's operators", () => {
      const grammar = `
        Compilation <- Word:While
        Word <- r'\\w+'
        While <- 'while'
        `;
      const parser = new PikaParser(
        parseGrammar(grammar) as Peg,
        'Compilation'
      );
      const s = `while`;
      const result = parser.parse(s);
      assert(result);
      assert.equal(result[1].offset, s.length);
    });
    it('should handle the Java grammar', () => {
      const grammar = fs
        .readFileSync('./grammar/java/full/Java.18.peg')
        .toString();
      const parser = new PikaParser(
        parseGrammar(grammar) as Peg,
        'Compilation'
      );
      const s = `class Foo { int main() { foo(); } }`;
      const result = parser.parse(s);
      assert(result);
      assert.equal(result[1].offset, s.length);
    });
  });
});
