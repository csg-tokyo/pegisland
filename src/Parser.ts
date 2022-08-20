// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { FirstCalculator } from './FirstCalculator';
import { GeneralPegBuilder } from './GeneralPegBuilder';
import { PackratParser, ParsingError } from './PackratParser';
import { IParseTree } from './ParseTree';
import { IParsingExpression, Nonterminal } from './ParsingExpression';
import { Peg } from './Peg';
import { BottomUpParser } from './BottomUpParser';

export function parseGrammar(grammar: string): Peg | ParsingError | Error {
  const builder = new GeneralPegBuilder();
  const result = builder.build(grammar);
  return result;
}

function isLeftRecursive(peg: Peg): boolean {
  const firstSets = new FirstCalculator(peg.rules).calculate();
  return [...peg.rules.entries()].some(([symbol, rule]) =>
    [...(firstSets.get(rule.rhs) as Set<IParsingExpression>)].some(
      (pe) => pe instanceof Nonterminal && pe.rule.symbol == symbol
    )
  );
}

export class Parser {
  private pegInterpreter: PackratParser | BottomUpParser;

  constructor(peg: Peg) {
    if (isLeftRecursive(peg)) {
      this.pegInterpreter = new BottomUpParser(peg);
    } else {
      this.pegInterpreter = new PackratParser(peg.rules);
    }
  }

  public parse(
    s: string,
    startSymbol?: string
  ): IParseTree | ParsingError | Error {
    return this.pegInterpreter.parse(s, startSymbol);
  }
}
