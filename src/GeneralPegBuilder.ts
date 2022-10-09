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
  public readonly rules = new Map<string, Rule>();

  private readonly visitedRules = new Set<Rule>();

  public build(grammar: string): Peg | ParsingError | Error {
    const pegParser = new PegParser();
    const result = pegParser.parse(grammar);
    if (result instanceof Error) {
      return result;
    }

    const [seq] = result.childNodes;
    const [, plus] = seq.childNodes;
    plus.childNodes.forEach((node) => {
      const [seq] = node.childNodes;
      const [id] = seq.childNodes[1].childNodes[0].childNodes;
      assert(id instanceof NodeTerminal);
      const rule = this.getRule(id.text);
      rule.rhs = this.processExpression(seq.childNodes[3]);

      // check if it has a water annotation
      const optAnnotations = seq.childNodes[0] as NodeNonterminal;
      const [annotations] = optAnnotations.childNodes;
      const hasAnnotation = annotations.childNodes.length > 0;
      rule.isWater = hasAnnotation;
    });
    const toplevelRules = difference(
      new Set(this.rules.values()),
      this.visitedRules
    );
    return new Peg(this.rules, [...toplevelRules]);
  }

  private getRule(symbol: string): Rule {
    if (!this.rules.has(symbol)) {
      this.rules.set(symbol, new Rule(symbol, new pe.NullParsingExpression()));
    }
    return this.rules.get(symbol) as Rule;
  }

  private processExpression(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    assert(seq instanceof NodeSequence);
    const [rewriting, star] = seq.childNodes;
    const rewritings = [rewriting];
    star.childNodes.forEach((seq) => {
      const [, rewriting] = seq.childNodes;
      rewritings.push(rewriting);
    });
    const operands = rewritings.map((rewriting) =>
      this.processRewriting(rewriting)
    );
    return operands.length === 1 ? operands[0] : new pe.OrderedChoice(operands);
  }

  private processRewriting(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [sequence, opt] = seq.childNodes;
    let operand = this.processSequence(sequence);
    if (opt.childNodes.length === 1) {
      const [seq] = opt.childNodes;
      const [, str] = seq.childNodes;
      const [choice] = str.childNodes[0].childNodes;
      const [term] = choice.childNodes;
      assert(term instanceof NodeTerminal);
      const result = eval(term.text) as string;
      operand = new pe.Rewriting(operand, result);
    }
    return operand;
  }

  private processSequence(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [star] = node.childNodes;
    const operands = star.childNodes.map((node) =>
      this.processPrefix(node.childNodes[0])
    );
    return operands.length === 1 ? operands[0] : new pe.Sequence(operands);
  }

  private processPrefix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [opt, suffix] = seq.childNodes;
    let operand = this.processSuffix(suffix);
    if (opt.childNodes.length !== 0) {
      const choice = opt.childNodes[0] as NodeOrderedChoice;
      operand = new [pe.And, pe.Not][choice.index](operand);
    }
    return operand;
  }

  private processSuffix(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [primary, opt] = seq.childNodes;
    let operand = this.processPrimary(primary);
    if (opt.childNodes.length !== 0) {
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
    const [choiceOperand] = choice.childNodes;
    const colonSeq = choiceOperand as NodeSequence;
    const [, rhs] = colonSeq.childNodes;
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

  private processOperatorWithOneOperand(
    node: IParseTree,
    PeCtor: { new (x: IParsingExpression): IParsingExpression }
  ) {
    assert(node instanceof NodeSequence);
    const operand = this.processExpression(node.childNodes[1]);
    return new PeCtor(operand);
  }

  private processGrouping(node: IParseTree) {
    return this.processOperatorWithOneOperand(node, pe.Grouping);
  }

  private processLake(node: IParseTree) {
    return this.processOperatorWithOneOperand(node, pe.Lake);
  }

  private processRegexp(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [choice] = seq.childNodes;
    const [term] = choice.childNodes;
    assert(term instanceof NodeTerminal);
    const { text } = term;
    return new pe.Terminal(text.slice(2, text.length - 1), text);
  }

  private processNamedIdentifier(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [opt] = seq.childNodes;
    assert(opt instanceof NodeOptional);
    let subname = '';
    if (opt.childNodes.length > 0) {
      const optSeq = opt.childNodes[0] as NodeSequence;
      const term = optSeq.childNodes[0] as NodeTerminal;
      subname = term.text;
    }
    const id = seq.childNodes[1] as NodeNonterminal;
    {
      const [seq] = id.childNodes;
      const [term] = seq.childNodes;
      assert(term instanceof NodeTerminal);
      const rule = this.getRule(term.text);
      this.visitedRules.add(rule);
      return new pe.Nonterminal(rule, subname);
    }
  }

  private processString(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [choice] = seq.childNodes;
    const [term] = choice.childNodes;
    assert(term instanceof NodeTerminal);
    const result = eval(term.text) as string;
    return new pe.Terminal(
      result.replace(/([^0-9a-zA-Z])/g, '\\$1'),
      term.text
    );
  }

  private processClass(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    const [seq] = node.childNodes;
    const [terminal] = seq.childNodes;
    assert(terminal instanceof NodeTerminal);
    const text =
      terminal.text[0] === '^'
        ? `[^${terminal.text.substring(2)}`
        : terminal.text;
    return new pe.Terminal(text, terminal.text);
  }

  private processDot(node: IParseTree): IParsingExpression {
    assert(node instanceof NodeNonterminal);
    return new pe.Terminal(/./, '.');
  }
}

function createXPlus(
  lhs: IParsingExpression,
  rhs: IParsingExpression,
  PeCtor: { new (x: IParsingExpression): IParsingExpression }
) {
  return new pe.Sequence([
    new PeCtor(new pe.Grouping(new pe.Sequence([new pe.Not(rhs), lhs]))),
    rhs,
  ]);
}

function createPlusPlus(lhs: IParsingExpression, rhs: IParsingExpression) {
  return createXPlus(lhs, rhs, pe.OneOrMore);
}

function createStarPlus(lhs: IParsingExpression, rhs: IParsingExpression) {
  return createXPlus(lhs, rhs, pe.ZeroOrMore);
}
