import assert from 'assert';
import {
  IParseTree,
  createParser,
  Parser,
  DefaultParseTreeVisitor,
  NodeNonterminal,
  NodeTerminal,
  NodeLake,
  NodeZeroOrMore,
  NodeOptional,
  NodeNot,
  NodeGrouping,
  NodeRewriting,
  NodeSequence,
  NodeOrderedChoice,
  NodeAnd,
} from '../src';

describe('IParseTreeVisitor', () => {
  it('visitNonterminal should be called', () => {
    const grammar = `
        program     <- X
        X           <- 'abc'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitNonterminal(_node: NodeNonterminal): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitTerminal should be called', () => {
    const grammar = `
        program     <- 'abc'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitTerminal(_node: NodeTerminal): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitLake should be called', () => {
    const grammar = `
        program     <- <<>>
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitLake(_node: NodeLake): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitZeroOrMore should be called', () => {
    const grammar = `
        program     <- .*
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitZeroOrMore(_node: NodeZeroOrMore): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitOneOrMore should be called', () => {
    const grammar = `
        program     <- .+
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitOneOrMore(_node: NodeZeroOrMore): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitOptional should be called', () => {
    const grammar = `
        program     <- 'abc'?
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitOptional(_node: NodeOptional): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitAnd should be called', () => {
    const grammar = `
        program     <- & 'abc' 'abc'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitAnd(_node: NodeAnd): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitNot should be called', () => {
    const grammar = `
        program     <- ! 'xyz' 'abc'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitNot(_node: NodeNot): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitGrouping should be called', () => {
    const grammar = `
        program     <- ('abc' )
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitGrouping(_node: NodeGrouping): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitRewriting should be called', () => {
    const grammar = `
        program     <- 'abc' -> 'xyz'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitRewriting(_node: NodeRewriting): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitSequence should be called', () => {
    const grammar = `
        program     <- 'a' 'b' 'c'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitSequence(_node: NodeSequence): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });

  it('visitOrderedChoie should be called', () => {
    const grammar = `
        program     <- 'abc' / 'xyz'
        `;
    const parser = createParser(grammar) as Parser;
    const tree = parser.parse('abc', 'program') as IParseTree;
    assert(!(tree instanceof Error));

    let count = 0;
    tree.childNodes[0].accept(
      new (class extends DefaultParseTreeVisitor {
        override visitOrderedChoice(_node: NodeOrderedChoice): void {
          count++;
        }
      })()
    );
    tree.childNodes[0].accept(new DefaultParseTreeVisitor());
    assert.strictEqual(count, 1);
  });
});
