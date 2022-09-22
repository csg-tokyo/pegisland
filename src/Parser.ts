// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { FirstCalculator } from './FirstCalculator';
import { GeneralPegBuilder } from './GeneralPegBuilder';
import { PackratParser, ParsingError } from './PackratParser';
import { IParseTree } from './ParseTree';
import {
  IParsingExpression,
  Nonterminal,
  NullParsingExpression,
} from './ParsingExpression';
import { Peg } from './Peg';
import { BottomUpParser } from './BottomUpParser';
import { isLake, processLakes } from './lake';
import { measure } from './utils';
import { Stats } from './Stats';

export function parseGrammar(grammar: string): Peg | ParsingError | Error {
  const builder = new GeneralPegBuilder();
  const result = builder.build(grammar);
  if (result instanceof Error) {
    return result;
  }
  const errors = [...result.rules.values()]
    .filter((rule) => rule.rhs instanceof NullParsingExpression)
    .filter((rule) => !isLake(rule.symbol))
    .map((rule) => new Error(`Rule '${rule.symbol}' is not defined.`));
  if (errors.length > 0) {
    return errors[0];
  }
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

  constructor(peg: Peg, public stats = new Stats()) {
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
    const [result, time] = measure(() =>
      this.pegInterpreter.parse(s, startSymbol)
    );
    this.stats.parsingTime += time;
    return result;
  }
}

export function createParser(
  grammar: string,
  waterSymbols = ['water']
): Parser | Error {
  const stats = new Stats();
  const [peg, grammarConstructionTime] = measure(() => parseGrammar(grammar));
  if (peg instanceof Error) {
    return peg;
  }
  stats.grammarConstructionTime = grammarConstructionTime;
  const [, time] = measure(() => processLakes(peg, waterSymbols));
  stats.lakeProcessingTime = time;
  const parser = new Parser(peg, stats);
  return parser;
}
