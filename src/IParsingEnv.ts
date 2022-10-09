import { IParseTree } from './ParseTree';
import { Position } from './Position';
import { Recognizer } from './Recognizer';
import { Rule } from './Rule';
import { IParsingExpression } from './ParsingExpression';

export interface IParsingEnv {
  s: string;
  parse(pe: IParsingExpression, pos: Position): [IParseTree, Position] | null;
  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null;
  push(): void;
  pop(): void;
  has(name: string): boolean;
  lookup(name: string): string;
  register(name: string, value: string): void;
}

export abstract class BaseParsingEnv<K extends object> implements IParsingEnv {
  readonly recognizer = new Recognizer(this);

  protected readonly memo;

  private symbolStack: { [name: string]: string }[] = [];

  constructor(public s: string) {
    this.memo = BaseParsingEnv.#createMemoTable<K>(s.length + 1);
  }

  static #createMemoTable<K extends object>(entryCount: number) {
    return [...Array(entryCount)].map(
      () => new WeakMap<K, [IParseTree, Position] | null>()
    );
  }

  push(): void {
    this.symbolStack.push({});
  }

  pop(): void {
    this.symbolStack.pop();
  }

  has(name: string): boolean {
    return name in this.symbolStack[this.symbolStack.length - 1];
  }

  lookup(name: string): string {
    return this.symbolStack[this.symbolStack.length - 1][name];
  }

  register(name: string, value: string): void {
    this.symbolStack[this.symbolStack.length - 1][name] = value;
  }

  parseRule(rule: Rule, pos: Position): [IParseTree, Position] | null {
    return rule.parse(this, pos);
  }

  abstract parse(
    pe: IParsingExpression,
    pos: Position
  ): [IParseTree, Position] | null;
}
