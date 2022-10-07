import { strict as assert } from 'assert';
import { BeginningCalculator } from '../src/BeginningCalculator';
import { SucceedCalculator } from '../src/SucceedCalculator';
import { GeneralPegBuilder } from '../src/GeneralPegBuilder';
import { Rule } from '../src/Rule';
import { AltCalculator } from '../src/AltCalculator';

describe('BeginningCalculator', () => {
  describe('#constructor()', () => {
    it('should calculate beginning sets', () => {
      const s = `

block      <- '{' stmt* '}'
stmt       <- expr_stmt / block 
expr_stmt  <- <elake>* ';'
<elake>    <- .

`;
      const builder = new GeneralPegBuilder();
      builder.build(s);
      const {rules} = builder;

      const beginningCalculator = new BeginningCalculator(builder.rules);
      beginningCalculator.calculate();
      const beginnings = beginningCalculator.peSet;
      assert(beginnings.get((rules.get('block') as Rule).rhs)?.size === 1);
      assert(beginnings.get((rules.get('stmt') as Rule).rhs)?.size === 2);
      assert(beginnings.get((rules.get('expr_stmt') as Rule).rhs)?.size === 2);
      assert(beginnings.get((rules.get('<elake>') as Rule).rhs)?.size === 1);

      const succeedCalculator = new SucceedCalculator(rules, beginnings);
      succeedCalculator.calculate();
      const succeeds = succeedCalculator.peSet;
      assert(succeeds.get((rules.get('block') as Rule).rhs)?.size === 2);
      assert(succeeds.get((rules.get('stmt') as Rule).rhs)?.size === 2);
      assert(succeeds.get((rules.get('expr_stmt') as Rule).rhs)?.size === 2);
      assert(succeeds.get((rules.get('<elake>') as Rule).rhs)?.size === 2);

      const altCalculator = new AltCalculator(rules, beginnings, succeeds);
      altCalculator.calculate();
      const alts = altCalculator.peSet;
      assert(alts.get((rules.get('block') as Rule).rhs)?.size === 1);
      assert(alts.get((rules.get('stmt') as Rule).rhs)?.size === 1);
      assert(alts.get((rules.get('expr_stmt') as Rule).rhs)?.size === 2);
      assert(alts.get((rules.get('<elake>') as Rule).rhs)?.size === 3);
    });
  });
});
