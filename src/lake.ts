// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import { AltCalculator } from './AltCalculator';
import { BeginningCalculator } from './BeginningCalculator';
import {
  IParsingExpression,
  Lake,
  Nonterminal,
  Not,
  NullParsingExpression,
  OrderedChoice,
  Sequence,
  Terminal,
} from './ParsingExpression';
import { DefaultParsingExpressionVisitor } from './IParsingExpressionVisitor';
import { PostorderExpressionTraverser } from './PostorderExpressionTraverser';
import { Rule } from './Rule';
import { Peg } from './Peg';
import { areEqualSets } from './set-operations';
import { SucceedCalculator } from './SucceedCalculator';

export function isLake(symbol: string) {
  return /^<.*?>$/.test(symbol);
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

function removeDuplications(
  rules: Map<string, Rule>,
  nonterminals: Nonterminal[]
) {
  return [
    ...new Set(nonterminals.map((nonterminal) => nonterminal.rule.symbol)),
  ].map((name) => new Nonterminal(rules.get(name) as Rule));
}

function removeDup(
  rules: Map<string, Rule>,
  symbols: Set<Terminal | Nonterminal>
) {
  const terminals = [...symbols].filter(
    (symbol) => symbol instanceof Terminal
  ) as Terminal[];
  const nonterminals = [...symbols].filter(
    (symbol) => symbol instanceof Nonterminal
  ) as Nonterminal[];
  return new Set([...terminals, ...removeDuplications(rules, nonterminals)]);
}

function convert(
  rules: Map<string, Rule>,
  alts: Map<IParsingExpression, Set<IParsingExpression>>
): Map<string, Set<Nonterminal | Terminal>> {
  const dic: Map<string, Set<Nonterminal | Terminal>> = new Map(
    [...rules.entries()].map(([symbol, rule]) => [
      symbol,
      removeDup(rules, alts.get(rule.rhs) as Set<Terminal | Nonterminal>),
    ])
  );
  return dic;
}

function expandLake(
  alts: Set<Terminal | Nonterminal>,
  altSymbols: Map<string, Set<Terminal | Nonterminal>>
): Set<Terminal | Nonterminal> {
  return new Set(
    [...alts]
      .map((alt) =>
        alt instanceof Nonterminal && isLake(alt.rule.symbol)
          ? [
              ...(altSymbols.get(alt.rule.symbol) as Set<
                Nonterminal | Terminal
              >),
            ]
          : alt
      )
      .flat()
  ) as Set<Terminal | Nonterminal>;
}

function expandLakes(
  altSymbols: Map<string, Set<Terminal | Nonterminal>>
): void {
  let isChanging = true;
  while (isChanging) {
    isChanging = false;
    [...altSymbols.keys()].forEach((key) => {
      const alts = altSymbols.get(key) as Set<Terminal | Nonterminal>;
      const expandedAlts = expandLake(alts, altSymbols);
      altSymbols.set(key, expandedAlts);
      isChanging ||= !areEqualSets(alts, expandedAlts);
    });
  }
}

function removeLakes(
  altSymbols: Map<string, Set<Terminal | Nonterminal>>
): void {
  [...altSymbols.keys()].forEach((key) => {
    const alts = altSymbols.get(key) as Set<Terminal | Nonterminal>;
    const altsWithoutLakes = new Set(
      [...alts].filter(
        (alt) => !(alt instanceof Nonterminal && isLake(alt.rule.symbol))
      )
    );
    altSymbols.set(key, altsWithoutLakes);
  });
}

export function processLakes(peg: Peg, waterSymbols: string[] = []): void {
  createRulesForLakeSymbols(peg);
  //console.log(peg.toString());

  const alts = calculateAlts(peg);
  const altSymbols = convert(peg.rules, alts);
  expandLakes(altSymbols);
  removeLakes(altSymbols);
  [...altSymbols.keys()].forEach((key) => {
    const alts = altSymbols.get(key) as Set<Terminal | Nonterminal>;
    altSymbols.set(key, removeDup(peg.rules, alts));
  });

  updateLakeRules(peg, altSymbols, waterSymbols);
  processLakeOperators(peg, alts);
}

function updateLakeRules(
  peg: Peg,
  altSymbols: Map<string, Set<Terminal | Nonterminal>>,
  waterSymbols: string[]
) {
  peg.rules.forEach((rule, symbol) => {
    const isLakeSymbol = isLake(symbol);
    if (isLakeSymbol) {
      const altSet = altSymbols.get(rule.symbol) as Set<IParsingExpression>;
      updateLakeRule(altSet, waterSymbols, peg, rule);
    }
  });
}

function updateLakeRule(
  altSet: Set<IParsingExpression>,
  waterSymbols: string[],
  peg: Peg,
  rule: Rule
) {
  let waters: IParsingExpression[] = [
    new Sequence([
      ...[...altSet.values()].map((symbol) => new Not(symbol)),
      new Terminal(/./, '.'),
    ]),
  ];
  const waterExps: IParsingExpression[] = [
    ...waterSymbols
      .filter((s) => peg.rules.has(s))
      .map((s) => new Nonterminal(peg.rules.get(s) as Rule)),
  ] as IParsingExpression[];
  waters = [...waterExps, ...waters];
  assert(!(rule.rhs instanceof NullParsingExpression));
  if (rule.rhs instanceof OrderedChoice) {
    rule.rhs.operands = [...rule.rhs.operands, ...waters];
  } else if (isDummy(rule.rhs)) {
    rule.rhs = createRhs([...waters]);
  } else {
    rule.rhs = createRhs([rule.rhs, ...waters]);
  }
}

function createRulesForLakeSymbols(peg: Peg) {
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
}

function calculateAlts(peg: Peg) {
  const beginningCalculator = new BeginningCalculator(peg.rules);
  const beginnings = beginningCalculator.calculate();
  const succeedCalculator = new SucceedCalculator(peg.rules, beginnings);
  const succeeds = succeedCalculator.calculate();
  const altCalculator = new AltCalculator(peg.rules, beginnings, succeeds);
  const alts = altCalculator.calculate();
  return alts;
}

function processLakeOperators(
  peg: Peg,
  alts: Map<IParsingExpression, Set<IParsingExpression>>
) {
  class AltSetter extends DefaultParsingExpressionVisitor {
    constructor(
      private altSets: Map<IParsingExpression, Set<IParsingExpression>>,
      private waterRules: Rule[]
    ) {
      super();
    }
    override visitLake(pe: Lake): void {
      pe.makeSemantics(
        this.altSets.get(pe.operand) as Set<IParsingExpression>,
        this.waterRules
      );
    }
  }

  const waterRules = [...peg.rules.values()].filter((rule) => rule.isWater);
  peg.rules.forEach((rule, _symbol) => {
    const travarser = new PostorderExpressionTraverser(
      new AltSetter(alts, waterRules)
    );
    travarser.traverse(rule.rhs);
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
