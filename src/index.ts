// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { rewriteLakeSymbols } from './lake';
import { parseGrammar, Parser } from './Parser';
export { parseGrammar, rewriteLakeSymbols, Parser };
import { IParseTree, NodeNonterminal } from './ParseTree';
export { Peg } from './Peg';
export { ParsingError } from './PackratParser';
export * from './example';
export * from './search';
export * from './NodeTypeGenerator';
export * from './ParsingExpression';
export * from './ParseTree';

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
): void {
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
