// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { GeneralPegBuilder, IRuleFactory } from './GeneralPegBuilder';
import { IParseTree } from './ParseTree';
import { IParsingExpression, BaseRule } from './ParsingExpression';
import { Peg } from './Peg';
import { ParsingError, PegInterpreter } from './PegInterpreter';

class DefaultRuleFactory implements IRuleFactory {
  private static instance = new DefaultRuleFactory();
  createRule(symbol: string, rhs: IParsingExpression): BaseRule {
    return new BaseRule(symbol, rhs);
  }
  static getInstance() {
    return this.instance;
  }
}

export function parseGrammar(grammar: string): Peg | ParsingError | Error {
  const builder = new GeneralPegBuilder();
  const result = builder.build(grammar);
  return result;
}

export class Parser {
  private pegInterpreter: PegInterpreter;

  constructor(peg: Peg) {
    this.pegInterpreter = new PegInterpreter(peg.rules);
  }

  public parse(
    s: string,
    startSymbol?: string
  ): IParseTree | ParsingError | Error {
    return this.pegInterpreter.parse(s, startSymbol);
  }
}
