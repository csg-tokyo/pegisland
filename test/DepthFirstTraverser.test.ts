import {
  DefaultParsingExpressionVisitor,
  Lake,
  parseGrammar,
  Peg,
  Rewriting,
  Rule,
} from '../src';
import { DepthFirstTraverser } from '../src/DepthFirstTraverser';

describe('DepthFirstTraverser', () => {
  describe('#parse()', () => {
    it('should work with a left recursive grammar', () => {
      const grammar = `
        program <- <<>> -> "a"
          `;
      const peg = parseGrammar(grammar) as Peg;
      let count = 0;
      expect(peg).toBeInstanceOf(Peg);
      const startRule = peg.rules.get('program') as Rule;
      const startPe = startRule.rhs;

      class Visitor extends DefaultParsingExpressionVisitor {
        visitLake(_pe: Lake): void {
          count++;
        }
        visitRewriting(_pe: Rewriting): void {
          count++;
        }
      }
      const traverser = new DepthFirstTraverser(new Visitor(), [startPe]);
      traverser.traverse();
      expect(count).toEqual(2);
    });
  });
});
