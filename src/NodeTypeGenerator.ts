// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import fs from 'fs';
import {
  IParsingExpression,
  Nonterminal,
  Not,
  OneOrMore,
  Optional,
  OrderedChoice,
  Rule,
  Sequence,
  Terminal,
  ZeroOrMore,
} from './ParsingExpression';
import { Peg } from './Peg';

function symbolName(operand: IParsingExpression) {
  const nonterminal = operand as Nonterminal;
  const s = nonterminal.rule.symbol;
  return stripBracket(s);
}

function stripBracket(s: string): string {
  return s.replace(/<(.*?)>/, '$1');
}

function make_type(rule: Rule): string {
  const rhs = rule.rhs;
  const symbol = stripBracket(rule.symbol);
  if (rhs instanceof OrderedChoice) {
    if (!rhs.operands.every((operand) => operand instanceof Nonterminal)) {
      console.log('error');
    }
    const types = rhs.operands
      .map((operand) => symbolName(operand))
      .map((name) => `Node_${name}`)
      .join(' | ');
    return `export type Node_${symbol} = ${types}`;
  } else if (rhs instanceof Terminal) {
    return `export class Node_${symbol} extends Node {
    text: string;
    constructor(text: string) {
      super();
      this.text = text;
    }
  }`;
  } else {
    const operands = rhs instanceof Sequence ? rhs.operands : [rhs];
    const children = operands
      .filter((operand) => !(operand instanceof Not))
      .map((operand) => {
        let name = '';
        let isArray = '';
        if (operand instanceof Nonterminal) {
          name = operand.rule.symbol;
        } else if (
          operand instanceof ZeroOrMore ||
          operand instanceof OneOrMore ||
          operand instanceof Optional
        ) {
          name = symbolName(operand.operand);
          isArray = '[]';
        } else {
          console.log('error', operand);
        }
        return [name, `Node_${name}${isArray}`];
      });
    const members = children.map(
      ([memberName, memberType]) => `  ${memberName}: ${memberType};`
    );
    const parameters = children.map(
      ([memberName, memberType]) => `${memberName}: ${memberType}`
    );
    const initializers = children.map(
      ([memberName, memberType]) => `    this.${memberName} = ${memberName};`
    );
    const constructor = '';
    return `export class Node_${symbol} extends Node {
  ${members.join('\n')}
    constructor(${parameters.join(',')}) {
      super();
  ${initializers.join('\n')}
    }  
  }
  `;
  }
}

function make_builder(rule: Rule): string {
  const rhs = rule.rhs;
  const symbol = stripBracket(rule.symbol);
  if (rhs instanceof OrderedChoice) {
    if (
      !rhs.operands.every(
        (operand) => operand instanceof Nonterminal || operand instanceof Not
      )
    ) {
      console.log(
        'An operand of the sequence operator must be a nonterminal or a not predicate'
      );
    }
    const returns = rhs.operands
      .map((operand) => symbolName(operand))
      .map(
        (name, index) =>
          `return convert_${name}(choice.childNodes[0] as NodeNonterminal);`
      );
    const cases = returns
      .map((ret, index) => `case ${index}: ${ret}`)
      .join('\n');

    return `export function convert_${symbol}(tree: NodeNonterminal): Node_${symbol} {
  const choice = tree.childNodes[0] as NodeOrderedChoice;
  switch (choice.index) {
  ${cases}
  }
  ${returns[0]}
}`;
  } else if (rhs instanceof Terminal) {
    return `export function convert_${symbol}(tree: NodeNonterminal) {
        const term = tree.childNodes[0] as NodeTerminal;
        return register(new Node_${symbol}(term.text), tree);
    }`;
  } else if (rhs instanceof Sequence) {
    const operands = rhs.operands;
    const args = operands
      .map((operand, index) => [operand, index])
      .filter(([operand, _index]) => !(operand instanceof Not))
      .map(([operand, index]) => {
        let name = '';
        if (operand instanceof Nonterminal) {
          name = symbolName(operand);
          return `convert_${name}(seq.childNodes[${index}] as NodeNonterminal)`;
        } else if (
          operand instanceof ZeroOrMore ||
          operand instanceof OneOrMore ||
          operand instanceof Optional
        ) {
          name = symbolName(operand.operand);
          return `(seq.childNodes[${index}] as NodeZeroOrMore | NodeOneOrMore | NodeOptional).childNodes.map(
(child) => convert_${name}(child as NodeNonterminal))
`;
        } else {
          throw new Error(`${operand}`);
          return '';
        }
      })
      .join(', ');

    return `export function convert_${symbol}(tree: NodeNonterminal): Node_${symbol} {
const seq = tree.childNodes[0] as NodeSequence;
  return register(new Node_${symbol}(${args}), tree);
}`;
  } else if (
    rhs instanceof ZeroOrMore ||
    rhs instanceof OneOrMore ||
    rhs instanceof Optional
  ) {
    const name = symbolName(rhs.operand);
    return `export function convert_${symbol}(tree: NodeNonterminal): Node_${symbol} {
  const seq = tree.childNodes[0] as NodeZeroOrMore | NodeOneOrMore | NodeOptional;
  return new Node_${symbol}(seq.childNodes.map(
  (child) => convert_${name}(child as NodeNonterminal)));
}`;
  }
  return '';
}

function make_visitor(rule: Rule): string {
  const rhs = rule.rhs;
  const symbol = stripBracket(rule.symbol);
  return `  abstract ${symbol}(node: Node_${symbol}): T;`;
}

export function generateNodeTypes(peg: Peg, outfile: string): void {
  const rules = [...peg.rules.values()];
  const s = rules.map(make_type);
  const decls = rules
    .filter((rule) => !(rule.rhs instanceof OrderedChoice))
    .map(make_visitor)
    .join('\n');

  const visitor = `abstract class Visitor<T> {
  ${decls}
  }`;
  const builder = rules.map(make_builder).join('\n\n');

  const code = `
class Node {}
import { IParseTree, NodeTerminal, NodeNonterminal, NodeOneOrMore, NodeOptional, NodeOrderedChoice, NodeSequence, NodeZeroOrMore } from 'pegisland';

const f_TreeMap = new Map<Node, IParseTree>();

function register<T>(node: T, rawNode: IParseTree): T {
  f_TreeMap.set(node, rawNode);
  return node;
}

export function text(node: Node, text: string) {
  const parseTreeNode = f_TreeMap.get(node) as IParseTree;
  return text.substring(
    parseTreeNode.range.start.offset,
    parseTreeNode.range.end.offset
  );
}
  
${s.join('\n\n')}
  
${visitor}
${builder}
`;

  fs.writeFileSync(outfile, code);
}
