import { strict as assert } from 'assert';
import lineColumn from 'line-column';
import { NodeSequence, NodeTerminal, Range } from '../src/ParseTree';
import { Position } from '../src/Position';
import { min, max, searchExpressions, search, inRange } from '../src/search';

function pos(line: number, column: number) {
  return { line, column };
}

function range2(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number
) {
  return {
    start: pos(startLine, startCol),
    end: pos(endLine, endCol),
  };
}

describe('inRange', () => {
  const range = new Range(new Position(20, 2, 5), new Position(30, 3, 15));
  it('should return false when the line starts before the start', () => {
    expect(inRange(range, range2(3, 5, 3, 15))).toBeFalsy();
  });
  it('should return false when the line ends after the end', () => {
    expect(inRange(range, range2(2, 5, 2, 15))).toBeFalsy();
  });
  it('should return false when the column starts before the start', () => {
    expect(inRange(range, range2(2, 6, 3, 15))).toBeFalsy();
  });
  it('should return false when the column ends end the end', () => {
    expect(inRange(range, range2(2, 5, 3, 14))).toBeFalsy();
  });
});

describe('Search', () => {
  describe('#min', () => {
    it('should return the position that has the smaller line', () => {
      const { line, column } = min(pos(1, 2), pos(2, 1));
      assert.equal(line, 1);
      assert.equal(column, 2);
    });
    it('should return the position that has the smaller line', () => {
      const { line, column } = min(pos(3, 1), pos(2, 3));
      assert.equal(line, 2);
      assert.equal(column, 3);
    });
    it('should return the min position that has the smaller column', () => {
      const { line, column } = min(pos(1, 2), pos(1, 1));
      assert.equal(line, 1);
      assert.equal(column, 1);
    });
  });
  describe('#max', () => {
    it('should return the position that has the larger line', () => {
      const { line, column } = max(pos(1, 2), pos(2, 1));
      assert.equal(line, 2);
      assert.equal(column, 1);
    });
    it('should return the position that has the larger line', () => {
      const { line, column } = max(pos(3, 1), pos(2, 3));
      assert.equal(line, 3);
      assert.equal(column, 1);
    });
    it('should return the min position that has the larger column', () => {
      const { line, column } = max(pos(1, 2), pos(1, 1));
      assert.equal(line, 1);
      assert.equal(column, 2);
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
      const subtrees = searchExpressions(tree, range2(1, 2, 1, 8));
      assert.equal(subtrees.length, 2);
      const trees = search(tree, range2(1, 2, 1, 8));
      assert.equal(trees.length, 2);
    });
    it('should return the entire tree that covers a given range', () => {
      const subtrees = searchExpressions(tree, range2(1, 1, 1, 9));
      assert.equal(subtrees.length, 1);
      const trees = search(tree, range2(1, 1, 1, 9));
      assert.equal(trees.length, 1);
    });
  });
});
