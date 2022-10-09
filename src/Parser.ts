// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { BottomUpParser } from './BottomUpParser';
import { FirstCalculator } from './set/FirstCalculator';
import { GeneralPegBuilder } from './GeneralPegBuilder';
import { isLake, processLakes } from './lake';
import { PackratParser, ParsingError } from './PackratParser';
import { IParseTree } from './ParseTree';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  Lake,
  Nonterminal,
  Not,
  NullParsingExpression,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { IParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { PostorderExpressionTraverser } from './PostorderExpressionTraverser';
import { Peg } from './Peg';
import { GrammarInfo, Stats } from './Stats';
import { measure } from './utils';

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
      (pe) => pe instanceof Nonterminal && pe.rule.symbol === symbol
    )
  );
}

export class Parser {
  private pegInterpreter: PackratParser | BottomUpParser;

  constructor(peg: Peg, public stats = new Stats()) {
    if (isLeftRecursive(peg)) {
      stats.grammarInfo.isLeftRecursive = true;
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
      this.pegInterpreter.parse(s, startSymbol, this.stats)
    );
    this.stats.parsingTime += time;
    this.stats.totalTextLength += s.length;
    return result;
  }
}

export function createParser(
  grammar: string,
  waterSymbols = ['water']
): Parser | Error {
  const stats = new Stats();

  // Parse a grammar specification
  const [peg, grammarConstructionTime] = measure(() => parseGrammar(grammar));
  if (peg instanceof Error) {
    return peg;
  }
  stats.grammarConstructionTime = grammarConstructionTime;

  // Summarize the grammar
  analyzeGrammar(peg, stats.grammarInfo);

  if (
    stats.grammarInfo.lakeCount > 0 ||
    stats.grammarInfo.lakeSymbolCount > 0
  ) {
    // Process lakes
    const [, time] = measure(() => processLakes(peg, waterSymbols));
    stats.lakeProcessingTime = time;
  }

  // Create a parser
  const parser = new Parser(peg, stats);
  return parser;
}

class Counter implements IParsingExpressionVisitor {
  constructor(private readonly info: GrammarInfo) {}

  visitNonterminal(pe: Nonterminal): void {
    this.info.nonterminalCount++;
    if (isLake(pe.rule.symbol)) {
      this.info.lakeSymbolCount++;
    }
  }

  visitTerminal(_pe: Terminal): void {
    this.info.terminalCount++;
  }

  visitAnd(_pe: And): void {
    this.info.andCount++;
  }

  visitNot(_pe: Not): void {
    this.info.notCount++;
  }

  visitColon(_pe: Colon): void {
    this.info.colonCount++;
  }

  visitColonNot(_pe: ColonNot): void {
    this.info.colonNotCount++;
  }

  visitGrouping(_pe: Grouping): void {
    this.info.groupingCount++;
  }

  visitLake(_pe: Lake): void {
    this.info.lakeCount++;
  }

  visitZeroOrMore(_pe: ZeroOrMore): void {
    this.info.zeroOrMoreCount++;
  }

  visitOneOrMore(_pe: OneOrMore): void {
    this.info.oneOrMoreCount++;
  }

  visitOptional(_pe: Optional): void {
    this.info.optionalCount++;
  }

  visitOrderedChoice(_pe: OrderedChoice): void {
    this.info.orderedChoiceCount++;
  }

  visitRewriting(_pe: Rewriting): void {
    this.info.rewritingCount++;
  }

  visitSequence(_pe: Sequence): void {
    this.info.sequenceCount++;
  }
}

function analyzeGrammar(peg: Peg, info: GrammarInfo) {
  const traverser = new PostorderExpressionTraverser(new Counter(info));
  peg.rules.forEach((rule) => {
    if (!(rule.rhs instanceof NullParsingExpression)) {
      info.ruleCount++;
      traverser.traverse(rule.rhs);
    }
  });
}
