import { IParseTree, NodeNonterminal, Range } from './ParseTree';
import { Position } from './Position';
import { IParsingExpression } from './ParsingExpression';
import { IParsingEnv } from './IParsingEnv';

export class Rule {
  constructor(
    public symbol: string,
    public rhs: IParsingExpression,
    public isWater = false
  ) {}

  parse(env: IParsingEnv, pos: Position): [IParseTree, Position] | null {
    return this.parseWithoutMemo(env, pos);
  }

  parseWithoutMemo(
    env: IParsingEnv,
    pos: Position
  ): [IParseTree, Position] | null {
    env.push();
    const result = env.parse(this.rhs, pos);
    env.pop();
    if (result === null) {
      return null;
    }
    const [childNode, nextIndex] = result;
    return [
      new NodeNonterminal(this.symbol, new Range(pos, nextIndex), childNode),
      nextIndex,
    ];
  }
}
