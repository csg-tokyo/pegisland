// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { FirstCalculator } from './FirstCalculator';
import { GeneralPegBuilder } from './GeneralPegBuilder';
import { PackratParser, ParsingError } from './PackratParser';
import { IParseTree } from './ParseTree';
import {
  And,
  Colon,
  ColonNot,
  Grouping,
  IParsingExpression,
  IParsingExpressionVisitor,
  Lake,
  Nonterminal,
  Not,
  NullParsingExpression,
  OneOrMore,
  Optional,
  OrderedChoice,
  PostorderExpressionTraverser,
  Rewriting,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { Peg } from './Peg';
import { BottomUpParser } from './BottomUpParser';
import { isLake, processLakes } from './lake';
import { measure } from './utils';
import { GrammarInfo, Stats } from './Stats';
import { stat } from 'fs';

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

  // Summerize the grammar
  analyzeGrammar(peg, stats.grammarInfo);

  // Process lakes
  const [, time] = measure(() => processLakes(peg, waterSymbols));
  stats.lakeProcessingTime = time;

  // Create a parser
  const parser = new Parser(peg, stats);
  return parser;
}

function analyzeGrammar(peg: Peg, info: GrammarInfo) {
  const traverser = new PostorderExpressionTraverser(
    new (class implements IParsingExpressionVisitor {
      visitNonterminal(pe: Nonterminal): void {
        info.expressionCount++;
        info.nonterminalCount++;
        if (isLake(pe.rule.symbol)) {
          info.lakeSymbolCount++;
        }
      }
      visitTerminal(pe: Terminal): void {
        info.expressionCount++;
        info.terminalCount++;
      }
      visitAnd(pe: And): void {
        info.expressionCount++;
        info.andCount++;
      }
      visitNot(pe: Not): void {
        info.expressionCount++;
        info.notCount++;
      }
      visitColon(pe: Colon): void {
        info.expressionCount++;
        info.colonCount++;
      }
      visitColonNot(pe: ColonNot): void {
        info.expressionCount++;
        info.colonNotCount++;
      }
      visitGrouping(pe: Grouping): void {
        info.expressionCount++;
        info.groupingCount++;
      }
      visitLake(pe: Lake): void {
        info.expressionCount++;
        info.lakeCount++;
      }
      visitZeroOrMore(pe: ZeroOrMore): void {
        info.expressionCount++;
        info.zeroOrMoreCount++;
      }
      visitOneOrMore(pe: OneOrMore): void {
        info.expressionCount++;
        info.oneOrMoreCount++;
      }
      visitOptional(pe: Optional): void {
        info.expressionCount++;
        info.optionalCount++;
      }
      visitOrderedChoice(pe: OrderedChoice): void {
        info.expressionCount++;
        info.orderedChoiceCount++;
      }
      visitRewriting(pe: Rewriting): void {
        info.expressionCount++;
        info.rewritingCount++;
      }
      visitSequence(pe: Sequence): void {
        info.expressionCount++;
        info.sequenceCount++;
      }
    })()
  );
  peg.rules.forEach((rule) => {
    if (!(rule.rhs instanceof NullParsingExpression)) {
      info.ruleCount++;
      traverser.traverse(rule.rhs);
    }
  });
}
