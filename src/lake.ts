// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import assert from 'assert';
import { AltCalculator } from './AltCalculator';
import { BeginningCalculator } from './BeginningCalculator';
import {
  Not,
  NullParsingExpression,
  OrderedChoice,
  IParsingExpression,
  Sequence,
  Terminal,
  Rule,
} from './ParsingExpression';
import { Peg } from './Peg';
import { SucceedCalculator } from './SucceedCalculator';

function isLake(symbol: string) {
  return symbol.startsWith('<');
}

function isDummy(rhs: IParsingExpression): boolean {
  if (rhs instanceof Sequence) {
    if (rhs.operands.length == 2) {
      const [first, second] = rhs.operands;
      return (
        first instanceof Not &&
        first.operand instanceof Terminal &&
        first.operand.regex.source == '.' &&
        second instanceof Terminal &&
        second.regex.source == '.'
      );
    }
  }
  return false;
}

export function rewriteLakeSymbols(
  peg: Peg,
  waterSymbols: string[] = []
): void {
  [...peg.rules.keys()]
    .filter((symbol) => isLake(symbol))
    .forEach((lakeSymbol) => {
      const rule = peg.rules.get(lakeSymbol) as Rule;
      if (rule.rhs instanceof NullParsingExpression) {
        rule.rhs = new Sequence([
          new Not(new Terminal(/./, '.')),
          new Terminal(/./, '.'),
        ]);
      }
    });
  //console.log(peg.toString());

  const beginningCalculator = new BeginningCalculator(peg.rules);
  const beginnings = beginningCalculator.calculate();
  const succeedCalculator = new SucceedCalculator(peg.rules, beginnings);
  const succeeds = succeedCalculator.calculate();
  const altCalculator = new AltCalculator(peg.rules, beginnings, succeeds);
  const alts = altCalculator.calculate();

  peg.rules.forEach((rule, symbol) => {
    const altSet = alts.get(rule.rhs) as Set<IParsingExpression>;
    const isLakeSymbol = isLake(symbol);
    if (isLakeSymbol) {
      let waters: IParsingExpression[] = [
        new Sequence([
          ...[...altSet.values()].map((symbol) => new Not(symbol)),
          new Terminal(/./, '.'),
        ]),
      ];
      const waterExps: IParsingExpression[] = [
        ...waterSymbols
          .map((s) => peg.rules.get(s)?.rhs)
          .filter((rhs) => rhs != undefined),
      ] as IParsingExpression[];
      waters = [...waterExps, ...waters];
      const hasRhs = !(rule.rhs instanceof NullParsingExpression);
      if (hasRhs) {
        if (rule.rhs instanceof OrderedChoice) {
          rule.rhs.operands = [...rule.rhs.operands, ...waters];
        } else if (isDummy(rule.rhs)) {
          rule.rhs = createRhs([...waters]);
        } else {
          rule.rhs = createRhs([rule.rhs, ...waters]);
        }
      } else {
        rule.rhs = createRhs(waters);
      }
    }
  });
}

function createRhs(expressions: IParsingExpression[]) {
  assert(expressions.length > 0);
  if (expressions.length == 1) {
    return expressions[0];
  } else {
    return new OrderedChoice(expressions);
  }
}
