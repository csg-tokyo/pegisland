// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { rewriteLakeSymbols } from './lake';
import { parseGrammar, Parser } from './Parser';
export { parseGrammar, rewriteLakeSymbols, Parser };
import { IParseTree, NodeNonterminal } from './ParseTree';
export { Peg } from './Peg';
export { ParsingError } from './PegInterpreter';
export { exampleGrammar, exampleSource } from './example';
export { searchExpressions } from './search';
export { generateNodeTypes } from './NodeTypeGenerator';
export type { IParsingExpression } from './ParsingExpression';
export {
  Terminal,
  Nonterminal,
  OneOrMore,
  Optional,
  OrderedChoice,
  BaseRule,
  Sequence,
  ZeroOrMore,
  Not,
  IParsingExpressionVisitor,
} from './ParsingExpression';
export {
  IParseTree,
  NodeTerminal,
  NodeNonterminal,
  NodeOneOrMore,
  NodeZeroOrMore,
  NodeOptional,
  NodeSequence,
  NodeOrderedChoice,
} from './ParseTree';

export function createParser(
  grammar: string,
  waterSymbols = ['water']
): Parser | Error {
  const peg = parseGrammar(grammar);
  if (peg instanceof Error) {
    return peg;
  }
  rewriteLakeSymbols(peg, waterSymbols);
  const parser = new Parser(peg);
  return parser;
}

export function traverseNonterminals(
  parseTree: IParseTree,
  func: (node: NodeNonterminal) => void
) {
  traverseTree(parseTree, (node) => {
    if (node instanceof NodeNonterminal) {
      func(node);
    }
  });
}

function traverseTree(parseTree: IParseTree, func: (node: IParseTree) => void) {
  parseTree.childNodes.forEach((node) => {
    func(node);
    traverseTree(node, func);
  });
}
