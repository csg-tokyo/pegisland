// Copyright (C) 2021- Katsumi Okuda.  All rights reserved.
import { strict as assert } from 'assert';
import { ParsingError } from './PackratParser';
import {
  IParseTree,
  NodeNonterminal,
  NodeOptional,
  NodeOrderedChoice,
  NodeSequence,
  NodeTerminal,
} from './ParseTree';
import * as pe from './ParsingExpression';
import { IParsingExpression } from './ParsingExpression';
import { Rule } from './Rule';
import { Peg } from './Peg';
import { PegParser } from './PegParser';
import { difference } from './set-operations';

export class GeneralPegBuilder {
  public rules = new Map<string, Rule>();
  private visitedRules = new Set<Rule>();

  private getRule(symbol: string): Rule {
    if (!this.rules.has(symbol)) {
      this.rules.set(symbol, new Rule(symbol, new pe.NullParsingExpression()));
    }
    return this.rules.get(symbol) as Rule;
  }

  public build(grammar: string): Peg | ParsingError | Error {
    const pegParser = new PegParser();
    const result = pegParser.parse(grammar);
    if (result instanceof Error) {
      return result;
    }

    const seq = result.childNodes[0];
    const plus = seq.childNodes[1];
    plus.childNodes.forEach((node) => {
      const seq = node.childNodes[0];
      const id = seq.childNodes[1].childNodes[0].childNodes[0] as NodeTerminal;
      const rule = this.getRule(id.text);
      rule.rhs = this.processExpression(seq.childNodes[3]);

      // check if it has a water annotation
      const optAnnotations = seq.childNodes[0] as NodeNonterminal;
      const annotations = optAnnotations.childNodes[0];
      const hasAnnotation = annotations.childNodes.length > 0;
      rule.isWater = hasAnnotation;
    });
    const toplevelRules = difference(
      new Set(this.rules.values()),
      this.visitedRules
    );
    return new Peg(this.rules, [...toplevelRules]);
  }

  private processExpression(node: IParseTree): IParsingExpression {
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
    return operands.length == 1 ? operands[0] : new pe.OrderedChoice(operands);
  }

  private processRewriting(node: IParseTree): IParsingExpression {
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
      operand = new pe.Rewriting(operand, result);
    }
    return operand;
  }

  private processSequence(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const star = node.childNodes[0];
    const operands = star.childNodes.map((node) => {
      return this.processPrefix(node.childNodes[0]);
    });
    return operands.length == 1 ? operands[0] : new pe.Sequence(operands);
  }

  private processPrefix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const [opt, suffix] = seq.childNodes;
    let operand = this.processSuffix(suffix);
    if (opt.childNodes.length != 0) {
      const choice = opt.childNodes[0] as NodeOrderedChoice;
      operand = new [pe.And, pe.Not][choice.index](operand);
    }
    return operand;
  }

  private processSuffix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const [primary, opt] = seq.childNodes;
    let operand = this.processPrimary(primary);
    if (opt.childNodes.length != 0) {
      const choice = opt.childNodes[0] as NodeOrderedChoice;
      operand = [
        () => this.makeSuffixWithOperand(choice, operand),
        () => this.makeSuffixWithOperand(choice, operand),
        () => this.makeSuffixWithOperand(choice, operand),
        () => this.makeSuffixWithOperand(choice, operand),
        () => new pe.Optional(operand),
        () => new pe.ZeroOrMore(operand),
        () => new pe.OneOrMore(operand),
      ][choice.index]();
    }
    return operand;
  }

  private makeSuffixWithOperand(
    choice: NodeOrderedChoice,
    operand: IParsingExpression
  ) {
    const choiceOperand = choice.childNodes[0];
    const colonSeq = choiceOperand as NodeSequence;
    const rhs = colonSeq.childNodes[1];
    const rhsOperand = this.processPrimary(rhs);
    return [
      () => createStarPlus(operand, rhsOperand),
      () => createPlusPlus(operand, rhsOperand),
      () => new pe.ColonNot(operand, rhsOperand),
      () => new pe.Colon(operand, rhsOperand),
    ][choice.index]();
  }

  private processPrimary(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const choice = node.childNodes[0] as NodeOrderedChoice;
    assert(choice.index <= 6);
    return [
      this.processRegexp,
      this.processLake,
      this.processNamedIdentifier,
      this.processGrouping,
      this.processString,
      this.processClass,
      this.processDot,
    ][choice.index].call(this, choice.childNodes[0]);
  }

  private processGrouping(node: IParseTree) {
    assert(node instanceof NodeSequence);
    const operand = this.processExpression(node.childNodes[1]);
    return new pe.Grouping(operand);
  }

  private processLake(node: IParseTree) {
    assert(node instanceof NodeSequence);
    const operand = this.processExpression(node.childNodes[1]);
    return new pe.Lake(operand);
  }

  private processRegexp(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const text = term.text;
    return new pe.Terminal(text.slice(2, text.length - 1), text);
  }

  private processNamedIdentifier(node: IParseTree): IParsingExpression {
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
      return new pe.Nonterminal(rule, subname);
    }
  }

  private processString(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const choice = seq.childNodes[0];
    const term = choice.childNodes[0] as NodeTerminal;
    const result = eval(term.text) as string;
    return new pe.Terminal(
      result.replace(/([^0-9a-zA-Z])/g, '\\$1'),
      term.text
    );
  }

  private processClass(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const seq = node.childNodes[0];
    const terminal = seq.childNodes[0] as NodeTerminal;
    const text =
      terminal.text[0] == '^'
        ? '[^' + terminal.text.substring(2)
        : terminal.text;
    return new pe.Terminal(text, terminal.text);
  }

  private processDot(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    return new pe.Terminal(/./, '.');
  }
}

function createPlusPlus(lhs: IParsingExpression, rhs: IParsingExpression) {
  return new pe.Sequence([
    new pe.OneOrMore(new pe.Grouping(new pe.Sequence([new pe.Not(rhs), lhs]))),
    rhs,
  ]);
}

function createStarPlus(lhs: IParsingExpression, rhs: IParsingExpression) {
  return new pe.Sequence([
    new pe.ZeroOrMore(new pe.Grouping(new pe.Sequence([new pe.Not(rhs), lhs]))),
    rhs,
  ]);
}
