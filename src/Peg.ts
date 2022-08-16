// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import {
  And,
  Grouping,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  IParsingExpression,
  Rewriting,
  BaseRule,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';

export function peToString(pe: IParsingExpression): string {
  if (pe instanceof Terminal) {
    return pe.source;
  } else if (pe instanceof Nonterminal) {
    return (
      (pe.name == '' ? '' : pe.name + ':') +
      (pe.rule ? pe.rule.symbol : '=norule=')
    );
  } else if (pe instanceof ZeroOrMore) {
    return `${peToString(pe.operand)}*`;
  } else if (pe instanceof OneOrMore) {
    return `${peToString(pe.operand)}+`;
  } else if (pe instanceof Optional) {
    return `${peToString(pe.operand)}?`;
  } else if (pe instanceof Not) {
    return `!${peToString(pe.operand)}`;
  } else if (pe instanceof And) {
    return `&${peToString(pe.operand)}`;
  } else if (pe instanceof Sequence) {
    return pe.operands.map(peToString).join(' ');
  } else if (pe instanceof OrderedChoice) {
    return pe.operands.map(peToString).join(' / ');
  } else if (pe instanceof Grouping) {
    return `(${peToString(pe.operand)})`;
  } else if (pe instanceof Rewriting) {
    return `(${peToString(pe.operand)})`;
  }
  return 'unkown';
}

function ruleToString(rule: BaseRule): string {
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

export class Peg {
  constructor(public rules: Map<string, BaseRule>) {}

  toString(): string {
    return Array.from(this.rules)
      .map(([symbol, rule]) => `${symbol} <- ${ruleToString(rule)}`)
      .join('\n');
  }
}
