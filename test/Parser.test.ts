import * as fs from 'fs';
import { strict as assert } from 'assert';
import { parseGrammar, Parser } from '../src/Parser';
import {
  NodeZeroOrMore,
  NodeOneOrMore,
  NodeOrderedChoice,
  NodeSequence,
  NodeTerminal,
  NodeOptional,
  NodeRewriting,
  IParseTree,
  printTree,
} from '../src/ParseTree';
import { Peg } from '../src/Peg';
import {
  IParsingExpression,
  Nonterminal,
  OneOrMore,
  Optional,
  OrderedChoice,
  Sequence,
  ZeroOrMore,
} from '../src/ParsingExpression';
import { SSL_OP_MSIE_SSLV2_RSA_PADDING } from 'constants';

function doit(name: string, pe: IParsingExpression): void {
  if (pe instanceof Sequence) {
    const ok = pe.operands.every((operand) => {
      if (
        operand instanceof ZeroOrMore ||
        operand instanceof OneOrMore ||
        operand instanceof Optional
      ) {
        operand = operand.operand;
      }
      return operand instanceof Nonterminal;
    });
    if (ok) {
      const args = pe.operands.map((operand) => {
        let array = false;
        if (
          operand instanceof ZeroOrMore ||
          operand instanceof OneOrMore ||
          operand instanceof Optional
        ) {
          operand = operand.operand;
          array = true;
        }
        const nonterminal = operand as Nonterminal;
        return nonterminal.rule.symbol + ': Node' + (array ? '[]' : '');
      });
      const s = name + '(' + args.join(', ') + ')';
      console.log('XXX', s);
    }
  } else if (pe instanceof OrderedChoice) {
  } else {
    console.log(pe);
  }
}

describe('Parser', () => {
  describe('#constructor()', () => {
    it('should recognize a grammar written in PEG', () => {
      const grammar = `
      foo <- "1234"  r"4321" -> "abc" / &bar+ (!bar?* bar . [123] . _ "123")
      bar // comment
      <- "1234"
      `;
      assert(parseGrammar(grammar) instanceof Peg);
    });

    it('should recognize a string', () => {
      const grammar = `
      program     <- '[]'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('[]', 'program') as IParseTree;
      assert(tree.childNodes[0] instanceof NodeTerminal);
    });

    it('should recognize a string', () => {
      const grammar = `
      program     <- r'[a-z]+'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('ijk', 'program') as IParseTree;
      assert(tree.childNodes[0] instanceof NodeTerminal);
    });

    it('should recognize a sequence', () => {
      const grammar = `
      program     <- "a" "b"
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('ab', 'program') as IParseTree;
      assert(tree.childNodes[0] instanceof NodeSequence);
    });

    it('should recognize an ordered choice', () => {
      const grammar = `
      program     <- "a" / "b"
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('b', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeOrderedChoice);
      assert.equal(choice.index, 1);
    });

    it('should recognize zero or more string', () => {
      const grammar = `
      program     <- "a" *
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      {
        const tree = parser.parse('aa', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeZeroOrMore);
        assert.equal(choice.range.end.offset, 2);
      }
      {
        const tree = parser.parse('', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeZeroOrMore);
        assert.equal(choice.range.end.offset, 0);
      }
    });

    it('should recognize optional string', () => {
      const grammar = `
      program     <- "a" ?
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      {
        const tree = parser.parse('a', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeOptional);
        assert.equal(choice.range.end.offset, 1);
      }
      {
        const tree = parser.parse('', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeOptional);
        assert.equal(choice.range.end.offset, 0);
      }
    });

    it('should recognize one or more string', () => {
      const grammar = `
      program     <- "a" +
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      {
        const tree = parser.parse('aa', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeOneOrMore);
        assert.equal(choice.range.end.offset, 2);
      }
      {
        const tree = parser.parse('b', 'program');
        assert(tree instanceof Error);
      }
    });

    it('should work with !', () => {
      const grammar = `
      program     <- ! "a" [a-z]+
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('baba', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeSequence);
      assert.equal(choice.range.end.offset, 4);
    });

    it('should work with &', () => {
      const grammar = `
      program     <- & "a" [a-z]+
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('aaba', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeSequence);
      assert.equal(choice.range.end.offset, 4);
    });

    it('should work with ()', () => {
      const grammar = `
      program     <- ('a' 'b')+
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('abab', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeOneOrMore);
      assert.equal(choice.range.end.offset, 4);
    });

    it('should work with ->', () => {
      const grammar = `
      program     <- "a" -> "b"
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      {
        const tree = parser.parse('a', 'program') as IParseTree;
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeRewriting);
        assert.equal(choice.range.end.offset, 1);
      }
      {
        const tree = parser.parse('b', 'program');
        assert(tree instanceof Error);
      }
    });

    it('should work with nonterminal', () => {
      const grammar = `
      program     <- name:A name:A
      A           <- r'[abc][abc][abc]'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('abcabc', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeSequence);
      assert.equal(choice.range.end.offset, 6);
    });

    it('should recognize a grammar written in PEG', () => {
      const grammar = `
      program     <- spacing statement*
      spacing     <- r'\\s*'
      statement   <- ID ASSIGN expression
      expression  <- ID !ASSIGN
      ID          <- r'[a-z]+' spacing
      ASSIGN      <- '=' spacing
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const s = '   xyz = abc  lmn = opq    ';
      const result = parser.parse(s, 'program') as IParseTree;
      assert.equal(result.range.end.offset, s.length);
    });
    it('should handle the Java grammar', () => {
      const grammar = fs
        .readFileSync('./grammar/java/full/java.peg')
        .toString();
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const program = `
      class Foo {
        public static void main() {
          System.out.println("Hello world!");
        }
      }`;
      const tree = parser.parse(program, 'Compilation') as IParseTree;
      assert(tree);
      assert.equal(tree.range.start.line, 1);
      assert.equal(tree.range.start.column, 1);
      assert.equal(tree.range.end.line, 6);
      assert.equal(tree.range.end.column, 8);
    });

    it('should recognize named identifiers', () => {
      const grammar = `
      program     <- spacing statement
      spacing     <- r'\\s*'
      statement   <- a:ID b:ID a:ID b:ID
      ID          <- r'[a-z]+' spacing
      `;
      const peg = parseGrammar(grammar) as Peg;
      peg.rules.forEach((rule) => {
        doit(rule.symbol, rule.rhs);
      });
      const parser = new Parser(peg);
      const s = '   abc xyz abc xyz';
      const result = parser.parse(s, 'program') as IParseTree;
      assert.equal(result.range.end.offset, s.length);
      console.log(result);
      printTree(result);
    });
  });
});
