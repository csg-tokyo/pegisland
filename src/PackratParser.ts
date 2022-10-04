// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import lineColumn from 'line-column';
import { IParseTree } from './ParseTree';
import { IParsingExpression } from './ParsingExpression';
import { BaseParsingEnv } from './IParsingEnv';
import { Rule } from './Rule';
import { Position } from './Position';
import { peToString } from './Printer';
import { Stats } from './Stats';

function makeErrorMessage(env: PackratParsingEnv) {
  const finder = lineColumn(env.s);
  const info = finder.fromIndex(env.maxIndex);
  if (info) {
    return [
      `Parsing error at offset line ${info.line} column ${info.col}.`,
      'when parsing with the following parsing expressions:',
      ...[...env.deepestStack.map(peToString)].reverse(),
    ].join('\n');
  }
  return `Parsing error at offset ${env.maxIndex}`;
}

export class ParsingError extends Error {
  constructor(public env: PackratParsingEnv) {
    super(makeErrorMessage(env));
  }
}

export class PackratParser {
  constructor(public rules: Map<string, Rule>) {}

  private getStartRule(startSymbol?: string): Rule | Error {
    let rule = this.rules.values().next().value;
    if (startSymbol) {
      if (this.rules.has(startSymbol)) {
        rule = this.rules.get(startSymbol);
      } else {
        return Error(
          `Nonterminal symbol {startSymbol} does not exist in the grammar.`
        );
      }
    }
    return rule;
  }

  public parse(
    s: string,
    startSymbol?: string,
    stats?: Stats
  ): IParseTree | ParsingError | Error {
    const rule = this.getStartRule(startSymbol);
    if (rule instanceof Error) {
      return rule;
    }
    const env = new PackratParsingEnv(s, stats);
    const result = rule.parse(env, new Position(0, 1, 1));
    if (result == null) {
      return new ParsingError(env);
    }
    const [tree, nextPos] = result;
    if (nextPos.offset < s.length) {
      return new ParsingError(env);
    }
    return tree;
  }
}

export class PackratParsingEnv extends BaseParsingEnv<Rule> {
  private currentStack: IParsingExpression[] = [];
  deepestStack: IParsingExpression[] = [];
  public maxIndex = 0;

  constructor(s: string, private stats: Stats = new Stats()) {
    super(s);
  }

  override parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    if (!this.memo[pos.offset].has(rule)) {
      const result = rule.parse(this, pos);
      this.memo[pos.offset].set(rule, result);
      if (result == null) {
        this.stats.failureCount++;
      }
      this.stats.memoMissCount++;
    }
    this.stats.memoAccessCount++;
    return this.memo[pos.offset].get(rule) as [IParseTree, Position] | null;
  }

  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null {
    this.currentStack.push(pe);
    if (pos.offset >= this.maxIndex) {
      this.maxIndex = pos.offset;
      this.deepestStack = [...this.currentStack];
    }
    const result = pe.accept(this.recognizer, pos);
    this.currentStack.pop();
    return result;
  }
}
