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
  Colon,
  ColonNot,
  Lake,
} from './ParsingExpression';
import {
  NodeNonterminal,
  NodeOrderedChoice,
  NodeSequence,
  NodeTerminal,
  IParseTree,
  NodeOptional,
} from './ParseTree';
import { Peg } from './Peg';
import { difference } from './set-operations';
import { ParsingError } from './PackratParser';

export class GeneralPegBuilder {
  rules = new Map<string, Rule>();
  visitedRules = new Set<Rule>();
  lakes = 0;

  makeLakeSymbol(): string {
    return `<${this.lakes++}>`;
  }

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
    const toplevelRules = difference(
      new Set(this.rules.values()),
      this.visitedRules
    );
    return new Peg(this.rules, [...toplevelRules]);
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
    const [primary, opt] = seq.childNodes;
    let operand = this.processPrimary(primary);
    if (opt.childNodes.length != 0) {
      const choice = opt.childNodes[0] as NodeOrderedChoice;
      switch (choice.index) {
        case 0:
        case 1:
        case 2:
        case 3: {
          const choiceOperand = choice.childNodes[0];
          const colonSeq = choiceOperand as NodeSequence;
          const rhs = colonSeq.childNodes[1];
          const rhsOperand = this.processPrimary(rhs);
          switch (choice.index) {
            case 0:
              operand = new Sequence([
                new ZeroOrMore(new Sequence([new Not(rhsOperand), operand])),
                rhsOperand,
              ]);
              break;
            case 1:
              operand = new Sequence([
                new OneOrMore(new Sequence([new Not(rhsOperand), operand])),
                rhsOperand,
              ]);
              break;
            case 2:
              operand = new ColonNot(operand, rhsOperand);
              break;
            case 3:
              operand = new Colon(operand, rhsOperand);
              break;
          }
          break;
        }
        case 4:
          operand = new Optional(operand);
          break;
        case 5:
          operand = new ZeroOrMore(operand);
          break;
        case 6:
          operand = new OneOrMore(operand);
          break;
      }
    }
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
      case 1: {
        /*
        const seq = choice.childNodes[0];
        const lakeSymbol = this.makeLakeSymbol();
        const rule = this.getRule(lakeSymbol);
        rule.rhs = this.processExpression(seq.childNodes[1]);
        result = new ZeroOrMore(new Nonterminal(rule));
        */
        const seq = choice.childNodes[0];
        const operand = this.processExpression(seq.childNodes[1]);
        result = new Lake(operand);
        break;
      }
      case 2:
        result = this.processNamedIdentifier(choice.childNodes[0]);
        break;
      case 3: {
        const seq = choice.childNodes[0];
        const operand = this.processExpression(seq.childNodes[1]);
        result = new Grouping(operand);
        break;
      }
      case 4:
        result = this.processString(choice.childNodes[0]);
        break;
      case 5:
        result = this.processClass(choice.childNodes[0]);
        break;
      case 6:
        result = this.processDot(choice.childNodes[0]);
        break;
      default:
        assert(false, 'unexpected index');
    }
    return result;
  }

  processRegexp(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const text = term.text;
    return new Terminal(text.slice(2, text.length - 1), text);
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
      const rule = this.getRule(term.text) as Rule;
      this.visitedRules.add(rule);
      return new Nonterminal(rule, subname);
    }
  }

  processString(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const result = eval(term.text) as string;
    return new Terminal(result.replace(/([^0-9a-zA-Z])/g, '\\$1'), term.text);
  }

  processClass(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const terminal = seq.childNodes[0] as NodeTerminal;
    const text =
      terminal.text[0] == '^'
        ? '[^' + terminal.text.substring(2)
        : terminal.text;
    return new Terminal(text, terminal.text);
  }

  processDot(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    return new Terminal(/./, '.');
  }
}
