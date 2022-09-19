# PEGIsland: a general PEG-based parser supporting lake symbols

[![csg-tokyo](https://circleci.com/gh/csg-tokyo/pegisland.svg?style=svg)](https://circleci.com/gh/csg-tokyo/pegisland)

PEGIsland is a general parser supporting island grammars with `lake symbols`.
PEGIsland parses any text based on a given parsing expression grammar (PEG).
The user can utilize PEGIsland by describing a PEG for a language.
The acceptable PEG does not need to be complete grammar.
It can be an island grammar that only describes grammar rules for specific programming constructs of interest.
Hence, PEGIsland can be used not only for compilers or interpreters but also for software engineering tools interested in specific kinds of programming constructs.
To ease the description of an island grammar, PEGIsland supports `lake symbols` proposed in the following paper:

- Katsumi Okuda, Shigeru Chiba, "Lake symbols for island parsing", The Art, Science, and Engineering of Programming, 2021, Vol. 5, Issue 2, Article 11.

## An example of island parsing

While PEGIsland can be used as a complete parser, a typical use case is extracting specific programming constructs with an island grammar.
For example, PEGIsland can extract blocks starting with `{` and ending with `}` with an island grammar.
They cannot be extracted with naive regular expressions because they have recursive structures.
An example code for extracting blocks from a program written in C like languages is written like this:

```TypeScript
import { createParser, traverseNonterminals } from 'pegisland';
import { exit } from 'process';

const grammar = `
program <- <lake>*
<lake> <- block
block <- r'{\s*' <lake>* r'}\s*'
`;

const program = `int main(void) {
    for (int i = 0; i < 256; i++) {
        if (i % 2 == 0) {
            printf("Hello ");
        } else {
            printf("world!\n")
        }
    }
}
`;

// Create a parser
const parser = createParser(grammar);
if (parser instanceof Error) {
  console.log(parser.message);
  exit(1);
}

// Create a parse tree by parsing a program
const parseTree = parser.parse(program, 'program');
if (parseTree instanceof Error) {
  console.log(parseTree.message);
  exit(1);
}

// Search all blocks from the parse tree
traverseNonterminals(parseTree, (node) => {
  if (node.symbol == 'block') {
    const start = node.range.start;
    const end = node.range.end;
    console.log(
      `start: (${start.line}, ${start.column}), end: (${end.line}, ${end.column})`
    );
  }
});
```

When this code is run, positions of all blocks, including nested ones in the program stored in the variable `program` are shown in the standard output as follows:

```
start: (1, 16), end: (10, 2)
start: (2, 35), end: (9, 6)
start: (3, 25), end: (5, 10)
start: (5, 16), end: (8, 10)
```

Each line represents the text area of a block in the program.
For example, the last line `start: (5, 16), end: (8, 10)` represents the block starting on line 5 at column 16 and ending on line 8 at column 10 corresponding to the following code snippet:

```c
        {
            printf("world!\n")
        }

```

The grammar for extracting blocks is stored in the variable `grammar` in this code.
The function `createParser` creates a parser based on the grammar specified by its argument.
The method `parse` in the parser instance parses the program and generates a parse tree.
The function `traverseNonterminals` traverses all nodes corresponding to nonterminal symbols in the parse tree and applies the function specified as its argument.

## Acceptable grammars

PEGIsland takes a PEG, which consists of grammar rules.
Each grammar rule consists of a nonterminal or lake symbol and parsing expression separated by `<-` or `=` followed by optional `;`.
For example, the following line is a valid grammar rule for PEGIsland:

```
foo <- bar*
```

This rule describes that the nonterminal `foo` matches zero or more repetitions of the nonterminal `bar`.
This rule can also be written like this:

```
foo = bar*;
```

PEGIsland supports regular expressions for writing lexical rules for a language.
A regular expression can be described by surrounding it with `r'` and `'` like Python.
We can use any regular expression supported by JavaScript in PEGIsland.
For example, the rule for a lexical token for integer numbers can be described as follows:

```
NUMBER <- r'\d+\s*'
```

This rule describes that the nonterminal `NUMBER` matches one or more repetitions of a numerical digit followed by zero or more white spaces such as `123 `.
Appending additional spaces with a token is a convention in a PEG for scanner-less parsers.

We can get a practical grammar by writing one or more rules.
A typical calculator example can be described as follows:

```peg
expr <- term ((ADD / SUB) term)*
term <- factor ((MUL / DIV) factor)*
factor <- NUMBER / LPAREN expr RPAREN

ADD <- '+' spacing
SUB <- '-' spacing
MUL <- '*' spacing
DIV <- '/' spacing
LPAREN <- '(' spacing
RPAREN <- ')' spacing
NUMBER <- r'\d+\s*'
spacing <- r'\s*'
```

This grammar recognizes arithmetic expressions like `(123 + 1) * 4`.

## Lake symbols

A lake symbol is a special wildcard symbol for island grammars.
An island grammar is an incomplete grammar that describes only grammar rules for specific programming constructs of interest.
These interesting programming constructs are `islands,` and the remaining part of the program is called `water.`
The lake symbol is used to describe `water` in the grammar.
It is a grammar symbol like a nonterminal symbol and has an optional rule whose left-side is itself the same as nonterminal symbols.
The lake symbol is enclosed with `<>` to be distinguished from nonterminal symbols.
For example, `<e>` is a lake symbol.
Without its related rule, it is a special wildcard symbol supporting shortest match of any characters.
A lake symbol is typically used with a repeat operator such as `*` and `+`.
For example, the following rule matches blocks by enclosed by `{` and `}`.

```
block <- '{' <body>* '}'
```

`<body>*` matches any character until the parser encounters `}`.
Explicitly specified symbols are always prioritized over lake symbols.
In this case, `}` is prioritized over the lake symbol `<body>`.
This feature prevents the parser consumes a part of an island as water.
The above rules cannot match nested blocks. To make the nonterminal `block` match nested blocks, we can describe a rule for the lake `<body>` as follows:

```
<body> <- block
```

If a lake symbol has a rule, it works as a wildcard only when it fails to match the pattern specified on the right-hand side.
Therefore, `<body>` works as a wildcard if it fails to match `block` on its right-hand side of the rule.

Lake symbols do not provide a naive shortest match realized by `.*?` in regular expressions.
To explain this point, we extend the above rule as follows:

```
block <- '{' <body>* '}'
<body> <- block / <expr>* ';'
```

We added the lake `<expr>` to extract statements terminated by `;`.
If `<expr>*` were a simple shortest match, `<expr>* ';'` would happen to match an unexpected part of the input string.
For example, if the input is `{ x = 1; } y = 1;`, pattern `.*? ';'` may match its substring `} y = 1;` since `.` matches `}`.
The lake symbol `<expr>` does not match `}` since it is a part of the island `block`.

## Installation

To install, run:

    $ npm install pegisland

## Contributing

Bug reports and pull requests are welcome on GitHub at https://github.com/csg-tokyo/pegisland.

## License

PEGIsland is available as open-source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
