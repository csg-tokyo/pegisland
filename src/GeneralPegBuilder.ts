// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import { PegParser } from './PegParser';
import {
  And,
  Rule,
  Nonterminal,
  Not,
  NullParsingExpression,
  OrderedChoice,
  IParsingExpression,
  Sequence,
  Optional,
  ZeroOrMore,
  OneOrMore,
  Grouping,
  Terminal,
  Rewriting,
} from './ParsingExpression';
import {
  NodeNonterminal,
  NodeOrderedChoice,
  NodeSequence,
  NodeTerminal,
  IParseTree,
  NodeOptional,
} from './ParseTree';
import { ParsingError } from './PegInterpreter';
import { Peg } from './Peg';

export class GeneralPegBuilder {
  rules = new Map<string, Rule>();

  getRule(symbol: string): Rule {
    if (!this.rules.has(symbol)) {
      this.rules.set(symbol, new Rule(symbol, new NullParsingExpression()));
    }
    return this.rules.get(symbol) as Rule;
  }

  build(grammar: string): Peg | ParsingError | Error {
    const pegParser = new PegParser();
    const result = pegParser.parse(grammar);
    if (result instanceof Error) {
      return result;
    }

    const seq = result.childNodes[0];
    const plus = seq.childNodes[1];
    plus.childNodes.forEach((node) => {
      const seq = node.childNodes[0];
      const id = seq.childNodes[0].childNodes[0].childNodes[0] as NodeTerminal;
      const rule = this.getRule(id.text);
      rule.rhs = this.processExpression(seq.childNodes[2]);
    });
    return new Peg(this.rules);
  }

  processExpression(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    assert(seq instanceof NodeSequence);
    const [rewriting, star] = seq.childNodes;
    const rewritings = [rewriting];
    star.childNodes.forEach((seq) => {
      const rewriting = seq.childNodes[1];
      rewritings.push(rewriting);
    });
    const operands = rewritings.map((rewriting) =>
      this.processRewriting(rewriting)
    );
    return operands.length == 1 ? operands[0] : new OrderedChoice(operands);
  }
  processRewriting(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const [sequence, opt] = seq.childNodes;
    let operand = this.processSequence(sequence);
    if (opt.childNodes.length == 1) {
      const [seq] = opt.childNodes;
      const str = seq.childNodes[1];
      const choice = str.childNodes[0].childNodes[0];
      const term = choice.childNodes[0] as NodeTerminal;
      const result = eval(term.text) as string;
      operand = new Rewriting(operand, result);
    }
    return operand;
  }

  processSequence(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const star = node.childNodes[0];
    const operands = star.childNodes.map((node) => {
      return this.processPrefix(node.childNodes[0]);
    });
    return operands.length == 1 ? operands[0] : new Sequence(operands);
  }

  processPrefix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const [opt, suffix] = seq.childNodes;
    let operand = this.processSuffix(suffix);
    if (opt.childNodes.length != 0) {
      const choice = opt.childNodes[0] as NodeOrderedChoice;
      switch (choice.index) {
        case 0:
          operand = new And(operand);
          break;
        case 1:
          operand = new Not(operand);
          break;
      }
    }
    return operand;
  }

  processSuffix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const [primary, star] = seq.childNodes;
    let operand = this.processPrimary(primary);
    star.childNodes.forEach((node) => {
      const choice = node as NodeOrderedChoice;
      switch (choice.index) {
        case 0:
          operand = new Optional(operand);
          break;
        case 1:
          operand = new ZeroOrMore(operand);
          break;
        case 2:
          operand = new OneOrMore(operand);
          break;
      }
    });
    return operand;
  }

  processPrimary(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const choice = node.childNodes[0] as NodeOrderedChoice;
    let result: IParsingExpression = new NullParsingExpression();
    switch (choice.index) {
      case 0:
        result = this.processRegexp(choice.childNodes[0]);
        break;
      case 1:
        result = this.processNamedIdentifier(choice.childNodes[0]);
        break;
      case 2: {
        const seq = choice.childNodes[0];
        const operand = this.processExpression(seq.childNodes[1]);
        result = new Grouping(operand);
        break;
      }
      case 3:
        result = this.processString(choice.childNodes[0]);
        break;
      case 4:
        result = this.processClass(choice.childNodes[0]);
        break;
      case 5:
        result = this.processDot(choice.childNodes[0]);
        break;
    }
    return result;
  }

  processRegexp(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const text = term.text;
    return new Terminal(text.slice(2, text.length - 1));
  }

  processNamedIdentifier(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const opt = seq.childNodes[0] as NodeOptional;
    let subname = '';
    if (opt.childNodes.length > 0) {
      const optSeq = opt.childNodes[0] as NodeSequence;
      const term = optSeq.childNodes[0] as NodeTerminal;
      subname = term.text;
    }
    const id = seq.childNodes[1] as NodeNonterminal;
    {
      const seq = id.childNodes[0];
      const term = seq.childNodes[0] as NodeTerminal;
      return new Nonterminal(this.getRule(term.text) as Rule, subname);
    }
  }

  processString(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const result = eval(term.text) as string;
    return new Terminal(result.replace(/([^0-9a-zA-Z])/g, '\\$1'));
  }

  processClass(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const terminal = seq.childNodes[0] as NodeTerminal;
    return new Terminal(terminal.text);
  }

  processDot(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    return new Terminal(/./);
  }
}
