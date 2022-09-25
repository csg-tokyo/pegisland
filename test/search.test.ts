import { strict as assert } from 'assert';
import { NodeSequence, NodeTerminal, Range } from '../src/ParseTree';
import { Position } from '../src/ParsingExpression';
import { min, max, searchExpressions, search, inRange } from '../src/search';

describe('inRange', () => {
  const range = new Range(new Position(20, 2, 5), new Position(30, 3, 15));
  it('should return false when the line starts before the start', () => {
    expect(inRange(range, 3, 5, 3, 15)).toBeFalsy();
  });
  it('should return false when the line ends after the end', () => {
    expect(inRange(range, 2, 5, 2, 15)).toBeFalsy();
  });
  it('should return false when the column starts before the start', () => {
    expect(inRange(range, 2, 6, 3, 15)).toBeFalsy();
  });
  it('should return false when the column ends end the end', () => {
    expect(inRange(range, 2, 5, 3, 14)).toBeFalsy();
  });
});

describe('Search', () => {
  describe('#min', () => {
    it('should return the position that has the smaller line', () => {
      const [line, col] = min(1, 2, 2, 1);
      assert.equal(line, 1);
      assert.equal(col, 2);
    });
    it('should return the position that has the smaller line', () => {
      const [line, col] = min(3, 1, 2, 3);
      assert.equal(line, 2);
      assert.equal(col, 3);
    });
    it('should return the min position that has the smaller column', () => {
      const [line, col] = min(1, 2, 1, 1);
      assert.equal(line, 1);
      assert.equal(col, 1);
    });
  });
  describe('#max', () => {
    it('should return the position that has the larger line', () => {
      const [line, col] = max(1, 2, 2, 1);
      assert.equal(line, 2);
      assert.equal(col, 1);
    });
    it('should return the position that has the larger line', () => {
      const [line, col] = max(3, 1, 2, 3);
      assert.equal(line, 3);
      assert.equal(col, 1);
    });
    it('should return the min position that has the larger column', () => {
      const [line, col] = max(1, 2, 1, 1);
      assert.equal(line, 1);
      assert.equal(col, 2);
    });
  });

  describe('#search', () => {
    const tree = new NodeSequence(
      new Range(new Position(0, 1, 1), new Position(0, 1, 9)),
      [
        new NodeTerminal(
          new Range(new Position(0, 1, 1), new Position(0, 1, 3)),
          new RegExp(''),
          ''
        ),
        new NodeTerminal(
          new Range(new Position(0, 1, 3), new Position(0, 1, 5)),
          new RegExp(''),
          ''
        ),
        new NodeSequence(
          new Range(new Position(0, 1, 5), new Position(0, 1, 9)),
          [
            new NodeTerminal(
              new Range(new Position(0, 1, 5), new Position(0, 1, 7)),
              new RegExp(''),
              ''
            ),
            new NodeTerminal(
              new Range(new Position(0, 1, 7), new Position(0, 1, 9)),
              new RegExp(''),
              ''
            ),
          ]
        ),
      ]
    );
    it('should return the subtrees that covers a given range', () => {
      const subtrees = searchExpressions(tree, 1, 2, 1, 8);
      assert.equal(subtrees.length, 2);
      const trees = search(tree, 1, 2, 1, 8);
      assert.equal(trees.length, 2);
    });
    it('should return the entire tree that covers a given range', () => {
      const subtrees = searchExpressions(tree, 1, 1, 1, 9);
      assert.equal(subtrees.length, 1);
      const trees = search(tree, 1, 1, 1, 9);
      assert.equal(trees.length, 1);
    });
  });
});
