// Copyright (C) 2022- Katsumi Okuda.  All rights reserved.
export class GrammarInfo {
  isLeftRecursive = false;
  ruleCount = 0;
  expressionCount = 0;
  terminalCount = 0;
  nonterminalCount = 0;
  lakeSymbolCount = 0;
  lakeCount = 0;
  zeroOrMoreCount = 0;
  oneOrMoreCount = 0;
  optionalCount = 0;
  sequenceCount = 0;
  orderedChoiceCount = 0;
  andCount = 0;
  notCount = 0;
  rewritingCount = 0;
  groupingCount = 0;
  colonCount = 0;
  colonNotCount = 0;
}

export class Stats {
  parsingTime = 0;
  lakeProcessingTime = 0;
  grammarConstructionTime = 0;
  totalTextLength = 0;
  memoAccessCount = 0;
  memoMissCount = 0;
  failureCount = 0;
  grammarInfo = new GrammarInfo();
}
