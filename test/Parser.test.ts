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
  NodeLake,
  NodeNonterminal,
  traverseNonterminals,
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
import { createParser } from '../src';
import { create } from 'domain';
import { ChildProcess } from 'child_process';
import exp from 'constants';

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
    }
  } else if (pe instanceof OrderedChoice) {
    // XXX
  } else {
    //console.log(pe);
  }
}

describe('Parser', () => {
  describe('#constructor()', () => {
    it('should recognize a grammar written in PEG', () => {
      const grammar = `
      foo <- "1234"  r"4321" -> "abc" / &bar+ (!bar? bar . [123] . _ "123")
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
      program     <- r'[a-z]*'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('ijk', 'program') as IParseTree;
      assert(tree.childNodes[0] instanceof NodeTerminal);
    });

    it('should recognize a string by using a class', () => {
      const grammar = `
      program     <- ^[0-9]*
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('ijk', 'program') as IParseTree;
      assert(tree.childNodes[0] instanceof NodeZeroOrMore);
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

    it('should work with :', () => {
      const grammar = `
      program     <- ([a-z]+):"xyz" 
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('xyz', 'program') as IParseTree;
      assert.equal(tree.range.end.offset, 3);
      const tree2 = parser.parse('xyza', 'program') as IParseTree;
      assert(tree2 instanceof Error);
    });

    it('should work with :!', () => {
      const grammar = `
      program     <- ([a-z]+):!"xyz" 
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('xyza', 'program') as IParseTree;
      assert.equal(tree.range.end.offset, 4);
      const tree2 = parser.parse('xyz', 'program') as IParseTree;
      assert(tree2 instanceof Error);
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

    it('should work with lake operators', () => {
      const grammar = `
      program     <- << block >>
      block       <- '{' << block >> '}'
      `;
      //const parser = new Parser(parseGrammar(grammar) as Peg);
      const parser = createParser(grammar) as Parser;
      {
        const s = '{aaa{} }  ';
        const tree = parser.parse(s, 'program') as IParseTree;
        assert(tree != null);
        const choice = tree.childNodes[0];
        assert(choice instanceof NodeLake);
        assert.equal(choice.range.end.offset, s.length);
      }
      {
        const tree = parser.parse('b', 'program');
        //assert(tree instanceof Error);
      }
    });

    it("should work with lake and Mouse's operators", () => {
      const grammar = `
      program     <- .++ ':' .*+ ':' foo+ ';'
      foo         <- '*' (r'\\w+':<< >>):!r'\\d+'
      `;
      //const parser = new Parser(parseGrammar(grammar) as Peg);
      const parser = createParser(grammar) as Parser;
      const s = 'aa::*first*second*third;';
      const tree = parser.parse(s, 'program') as IParseTree;
      assert(tree != null);
      let count = 0;
      traverseNonterminals(tree, () => count++);
      assert.equal(count, 3);
    });

    it("should work with lake and Mouse's operators", () => {
      const grammar = `
      program     <- foo+ ';'
      foo         <- '*' &r'\\w+' !r'\\d+' (<<>> -> "a")
      `;
      //const parser = new Parser(parseGrammar(grammar) as Peg);
      const parser = createParser(grammar) as Parser;
      const s = '*first*second*third;';
      const tree = parser.parse(s, 'program') as IParseTree;
      assert(tree != null);
      let count = 0;
      traverseNonterminals(tree, () => count++);
      assert.equal(count, 3);
    });

    it('should work with nonterminal', () => {
      const grammar = `
      program     <- name@A name@A
      A           <- r'[abc][abc][abc]'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('abcabc', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeSequence);
      assert.equal(choice.range.end.offset, 6);
    });

    it('should work with nonterminal', () => {
      const grammar = `
      program     <- foo@B / name@A name@A
      A           <- r'[abc][abc][abc]'
      B           <- r'\\d+'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('abcabc', 'program') as IParseTree;
      const choice = tree.childNodes[0];
      assert(choice instanceof NodeOrderedChoice);
      assert.equal(choice.range.end.offset, 6);
    });

    it('should report an error when named nonterminals have not the same value', () => {
      const grammar = `
      program     <- name@A name@A
      A           <- r'[abc][abc][abc]'
      `;
      const parser = new Parser(parseGrammar(grammar) as Peg);
      const tree = parser.parse('aaabbb', 'program') as IParseTree;
      expect(tree).toBeInstanceOf(Error);
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
    // it('should handle C grammar', () => {
    //   const grammar = fs.readFileSync('./grammar/C/full/C.peg').toString();
    //   const peg = parseGrammar(grammar);
    //   if (peg instanceof Error) {
    //     console.log(peg.message);
    //     assert(false);
    //   }
    //   const parser = new Parser(peg);
    //   const program = `
    //   int main(void) {
    //     printf("Hello World!\\n");
    //   }
    //   `;
    //   const tree = parser.parse(program, 'TranslationUnit') as IParseTree;
    //   assert(tree);
    //   assert.equal(tree.range.end.offset, program.length);
    // });

    it('should operate on left recursion', () => {
      const grammar = `
      start    <- expr
      expr     <- expr '-' number / number
      number   <- r'\\d+'
      `;
      const peg = parseGrammar(grammar) as Peg;
      const parser = new Parser(peg);
      const s = '1';
      const result = parser.parse(s, 'start') as IParseTree;
      if (result instanceof Error) {
        console.log(result.message);
      }
      assert.equal(result.range.end.offset, s.length);
    });

    it('should operate on direct left recursion', () => {
      const grammar = `
      start    <- expr
      expr     <- expr '-' number / number
      number   <- r'\\d+'
      `;
      const peg = parseGrammar(grammar) as Peg;
      const parser = new Parser(peg);
      const s = '1-1-1';
      const result = parser.parse(s, 'start') as IParseTree;
      assert.equal(result.range.end.offset, s.length);
    });

    it('should operate on indirect left recursion', () => {
      const grammar = `
      start <- expr
      x   <- expr '[' number ']' / expr
      expr     <- x '-' number / number 
      number   <- r'\\d+'
      `;
      const peg = parseGrammar(grammar) as Peg;
      const parser = new Parser(peg);
      const s = '1-1-1';
      const result = parser.parse(s, 'start') as IParseTree;
      assert.equal(result.range.end.offset, s.length);
    });

    it('should recognize named identifiers', () => {
      const grammar = `
      program     <- spacing statement
      spacing     <- r'\\s*'
      statement   <- a@ID b@ID a@ID b@ID
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
      //console.log(result);
      //printTree(result);
    });

    it('should work with a lake symbol', () => {
      const grammar = `
      program     <- stmt
      stmt        <- <foo>* ';'
      foo         <- r'[a-z]'
      `;
      const parser = createParser(grammar, ['foo', 'bar']);
      if (parser instanceof Error) {
        return;
      }
      const s = 'abcdefg;';
      const result = parser.parse(s, 'program') as IParseTree;
      assert.equal(result.range.end.offset, s.length);

      //console.log(result);
      //printTree(result);
    });

    it('should work with lake operators', () => {
      const grammar = `
      program     <- stmt
      stmt        <- <<>> ';'
      `;
      const parser = createParser(grammar);
      if (parser instanceof Error) {
        return;
      }
      const s = 'abcdefg;';
      const result = parser.parse(s, 'program') as IParseTree;
      assert.equal(result.range.end.offset, s.length);

      //console.log(result);
      //printTree(result);
    });

    it('should work with a water annotation', () => {
      const grammar = `
      program     <- << 'b' >>
      @water
      water <- r'".*?"'
      `;
      const parser = createParser(grammar);
      if (parser instanceof Error) {
        return;
      }
      const s = 'abc"dbe"fg;';
      const result = parser.parse(s, 'program') as NodeNonterminal;
      const lake = result.childNodes[0];
      assert.equal(result.range.end.offset, s.length);
      assert.equal(lake.childNodes.length, 1);
    });

    it('should work with an empty lake and a water annotation', () => {
      const grammar = `
      program     <- << >>
      @water
      water <- r'".*?"'
      `;
      const parser = createParser(grammar);
      if (parser instanceof Error) {
        return;
      }
      const s = 'abc"dbe"fg;';
      const result = parser.parse(s, 'program') as NodeNonterminal;
      const lake = result.childNodes[0];
      assert.equal(result.range.end.offset, s.length);
      assert.equal(lake.childNodes.length, 0);
    });

    it('should report an error when a nonterminal does not have a rule', () => {
      const grammar = `
      program     <- nonterminal_without_rule
      `;
      const parser = createParser(grammar);
      assert(parser instanceof Error);
    });

    it('should not report an error when a lake does not have a rule', () => {
      const grammar = `
      program     <- <lake_without_rule>*
      `;
      const parser = createParser(grammar);
      assert(!(parser instanceof Error));
    });
  });

  it('should report an error when the input grammar is incorrect', () => {
    const grammar = `
    program     <- <- 
    `;
    const parser = createParser(grammar);
    assert(parser instanceof Error);
  });

  it('should work with various operators in a left-recursive grammar', () => {
    const grammar = `
    program     <- <<>> foo -> "a"
    foo         <- foo 'a' / 'a'
    `;
    //const parser = new Parser(parseGrammar(grammar) as Peg);
    const parser = createParser(grammar) as Parser;
    const s = 'aaaaa';
    const tree = parser.parse(s, 'program') as IParseTree;
    assert(tree != null);
    expect(tree.range.end.offset).toEqual(s.length);
  });

  it('Should report an error when the given symbol does not have a rule', () => {
    const grammar = `
      program     <- .*
      `;
    const parser = createParser(grammar) as Parser;

    const tree = parser.parse('abc', 'unknown_symbol') as IParseTree;
    expect(tree).toBeInstanceOf(Error);
  });
});
