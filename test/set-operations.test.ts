import { strict as assert } from 'assert';
import {
  areEqualSets,
  difference,
  intersection,
  union,
} from '../src/set-operations';

describe('util', () => {
  describe('#sameSet()', () => {
    it('should return true if the given sets are equal', () => {
      const x = new Set([1, 2, 3, 4, 5]);
      const y = new Set([1, 2, 3, 4, 5]);
      assert(areEqualSets(x, y));
    });
    it('should return false if the given sets have the different numbers of elements', () => {
      const x = new Set([1, 2, 3, 4, 5]);
      const y = new Set([1, 2, 3, 4, 5, 6]);
      assert(!areEqualSets(x, y));
    });
    it('should return false if the given sets have the different elements', () => {
      const x = new Set([1, 2, 3, 4, 5]);
      const y = new Set([1, 2, 3, 4, 6]);
      assert(!areEqualSets(x, y));
    });
  });
  describe('#uion()', () => {
    it('should return the union set of given sets', () => {
      const x = new Set([1, 2, 3]);
      const y = new Set([3, 4, 5]);
      const z = union(x, y);
      assert(areEqualSets(z, new Set([1, 2, 3, 4, 5])));
    });
  });
  describe('#intersection()', () => {
    it('should return the intersection set of given sets', () => {
      const x = new Set([1, 2, 3]);
      const y = new Set([3, 4, 5]);
      const z = intersection(x, y);
      assert(areEqualSets(z, new Set([3])));
    });
  });
  describe('#difference()', () => {
    it('should return the intersection set of given sets', () => {
      const x = new Set([1, 2, 3]);
      const y = new Set([3, 4, 5]);
      const z = difference(x, y);
      assert(areEqualSets(z, new Set([1, 2])));
    });
  });
});
