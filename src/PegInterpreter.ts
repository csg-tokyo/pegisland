// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { ParsingEnv, Position, Rule } from './ParsingExpression';
import { IParseTree } from './ParseTree';
import lineColumn from 'line-column';
import { peToString } from './Peg';

function makeErrorMessage(env: ParsingEnv) {
  const finder = lineColumn(env.s);
  const info = finder.fromIndex(env.maxIndex);
  if (info) {
    const offset = finder.toIndex(info.line, 1);
    const pe = env.deepestStack[env.deepestStack.length - 1];
    const pe2 = env.deepestStack[env.deepestStack.length - 2];
    return [
      `Parsing error at offset line ${info.line} column ${info.col}.`,
      'when parsing with the following parsing expressions:',
      ...[...env.deepestStack.map(peToString)].reverse(),
    ].join('\n');
  }
  return `Parsing error at offset ${env.maxIndex}`;
}

export class ParsingError extends Error {
  constructor(public env: ParsingEnv) {
    super(makeErrorMessage(env));
  }
}

export class PegInterpreter {
  rules: Map<string, Rule>;

  constructor(nonterminals: Map<string, Rule>) {
    this.rules = nonterminals;
  }

  clearMemo(): void {
    this.rules.forEach((rule) => (rule.memo = {}));
  }

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
    startSymbol?: string
  ): IParseTree | ParsingError | Error {
    this.clearMemo();
    const rule = this.getStartRule(startSymbol);
    if (rule instanceof Error) {
      return rule;
    }
    const env = new ParsingEnv(s);
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
