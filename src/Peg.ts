// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { OrderedChoice, Rule } from './ParsingExpression';
import { peToString } from './Printer';

function ruleToString(rule: Rule): string {
  if (rule.rhs instanceof OrderedChoice) {
    return (
      '\n' +
      Array.from(rule.rhs.operands.map(peToString))
        .map((s) => `    ${s}`)
        .join(' /\n')
    );
  }
  return peToString(rule.rhs);
}

function makeAnnotation(rule: Rule) {
  return rule.isWater ? '@water\n' : '';
}

export class Peg {
  constructor(public rules: Map<string, Rule>, public toplevelRules: Rule[]) {}

  toString(): string {
    return Array.from(this.rules)
      .map(
        ([symbol, rule]) =>
          `${makeAnnotation(rule)}${symbol} <- ${ruleToString(rule)}`
      )
      .join('\n');
  }
}
