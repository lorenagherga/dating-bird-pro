import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeGenotype, describePhenotypeGroup } from './describe.ts';
import { HALF, ONE, ZERO, addFractions, fractionsEqual, fraction, multiplyFractions } from './fraction.ts';
import { groupByPhenotype, offspringOutcomes, probabilityOfSex } from './punnett.ts';
import type { OffspringOutcome, ParentGenotype } from './punnett.ts';
import { computeInbreeding } from './wright-coi.ts';
import type { Pedigree } from './wright-coi.ts';
import type { Sex } from './loci.ts';

function conditionalWithinSex(outcomes: OffspringOutcome[], sex: Sex, matches: (o: OffspringOutcome) => boolean) {
  const sexTotal = probabilityOfSex(outcomes, sex);
  const matched = outcomes
    .filter((o) => o.sex === sex && matches(o))
    .reduce((acc, o) => addFractions(acc, o.probability), ZERO);
  return multiplyFractions(matched, fraction(sexTotal.den, sexTotal.num));
}

test('sex-linked: blue hen x brown cock gives 100% blue-split-brown sons and 100% brown daughters', () => {
  const sire: ParentGenotype = { sex: 'male', loci: { B: ['b', 'b'] } };
  const dam: ParentGenotype = { sex: 'female', loci: { B: ['B'] } };
  const outcomes = offspringOutcomes(sire, dam);

  const sonsSplit = conditionalWithinSex(outcomes, 'male', (o) => o.loci.B?.join('') === 'Bb');
  const daughtersBrown = conditionalWithinSex(outcomes, 'female', (o) => o.loci.B?.join('') === 'b');
  assert.ok(fractionsEqual(sonsSplit, ONE));
  assert.ok(fractionsEqual(daughtersBrown, ONE));
});

test('sex-linked: blue split-brown cock x brown hen gives 1/2 and 1/2 in each sex', () => {
  const sire: ParentGenotype = { sex: 'male', loci: { B: ['B', 'b'] } };
  const dam: ParentGenotype = { sex: 'female', loci: { B: ['b'] } };
  const outcomes = offspringOutcomes(sire, dam);

  assert.ok(fractionsEqual(probabilityOfSex(outcomes, 'male'), HALF));
  assert.ok(fractionsEqual(conditionalWithinSex(outcomes, 'male', (o) => o.loci.B?.join('') === 'Bb'), HALF));
  assert.ok(fractionsEqual(conditionalWithinSex(outcomes, 'female', (o) => o.loci.B?.join('') === 'b'), HALF));
  assert.ok(fractionsEqual(conditionalWithinSex(outcomes, 'female', (o) => o.loci.B?.join('') === 'B'), HALF));
});

test('hens are never split: a hen genotype is a single allele', () => {
  assert.throws(() =>
    offspringOutcomes(
      { sex: 'male', loci: { B: ['B', 'b'] } },
      { sex: 'female', loci: { B: ['B', 'b'] } }
    )
  );
});

test('autosomal recessive red: Ee x Ee gives 1/4 EE, 1/2 Ee, 1/4 ee in each sex', () => {
  const parent: ParentGenotype = { sex: 'male', loci: { e: ['E', 'e'] } };
  const dam: ParentGenotype = { sex: 'female', loci: { e: ['E', 'e'] } };
  const outcomes = offspringOutcomes(parent, dam);

  for (const sex of ['male', 'female'] as Sex[]) {
    assert.ok(fractionsEqual(conditionalWithinSex(outcomes, sex, (o) => o.loci.e?.join('') === 'EE'), fraction(1n, 4n)));
    assert.ok(fractionsEqual(conditionalWithinSex(outcomes, sex, (o) => o.loci.e?.join('') === 'Ee'), HALF));
    assert.ok(fractionsEqual(conditionalWithinSex(outcomes, sex, (o) => o.loci.e?.join('') === 'ee'), fraction(1n, 4n)));
  }
});

test('recessive red: carrier shows normal with split, homozygous shows red', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { e: ['E', 'e'] } },
    { sex: 'female', loci: { e: ['E', 'e'] } }
  );
  const groups = groupByPhenotype(outcomes).filter((g) => g.sex === 'female');
  const carrier = groups.find((g) => g.phenotype.e?.visible.code === 'E' && g.phenotype.e.split.length === 1);
  const red = groups.find((g) => g.phenotype.e?.visible.code === 'e');
  assert.ok(carrier);
  assert.ok(red);
  assert.ok(fractionsEqual(carrier.probability, fraction(1n, 4n)));
  assert.ok(fractionsEqual(red.probability, fraction(1n, 8n)));
});

test('independent loci on different chromosomes multiply exactly', () => {
  const sire: ParentGenotype = { sex: 'male', loci: { B: ['B', 'b'], e: ['E', 'e'] } };
  const dam: ParentGenotype = { sex: 'female', loci: { B: ['b'], e: ['e', 'e'] } };
  const outcomes = offspringOutcomes(sire, dam);

  const splitBrownAndCarrier = conditionalWithinSex(
    outcomes,
    'male',
    (o) => o.loci.B?.join('') === 'Bb' && o.loci.e?.join('') === 'Ee'
  );
  const brownRed = conditionalWithinSex(
    outcomes,
    'female',
    (o) => o.loci.B?.join('') === 'b' && o.loci.e?.join('') === 'ee'
  );
  assert.ok(fractionsEqual(splitBrownAndCarrier, fraction(1n, 4n)));
  assert.ok(fractionsEqual(brownRed, fraction(1n, 4n)));
});

test('probabilities sum to exactly one across all offspring', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { B: ['BA', 'b'], e: ['E', 'e'], z: ['+', 'z'] } },
    { sex: 'female', loci: { B: ['B'], e: ['E', 'e'], z: ['z', 'z'] } }
  );
  const total = outcomes.reduce((acc, o) => addFractions(acc, o.probability), ZERO);
  assert.ok(fractionsEqual(total, ONE));
});

test('phenotype grouping shows sex-specific visible colour and split', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { B: ['B', 'b'] } },
    { sex: 'female', loci: { B: ['b'] } }
  );
  const groups = groupByPhenotype(outcomes);
  const sons = groups.filter((g) => g.sex === 'male');
  assert.equal(sons.length, 2);
  const blueSplit = sons.find((g) => g.phenotype.B?.visible.code === 'B');
  assert.ok(blueSplit);
  assert.deepEqual(blueSplit.phenotype.B?.split.map((a) => a.code), ['b']);
});

test('translation: blue split brown reads correctly in Romanian and English', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { B: ['B', 'b'] } },
    { sex: 'female', loci: { B: ['b'] } }
  );
  const sons = groupByPhenotype(outcomes).filter((g) => g.sex === 'male');
  assert.deepEqual(sons.map((g) => describePhenotypeGroup(g, 'ro')).sort(), ['albastru (purtători de maro)', 'maro']);
  assert.deepEqual(sons.map((g) => describePhenotypeGroup(g, 'en')).sort(), ['blue (split brown)', 'brown']);
});

function pedigree(entries: Array<[string, string | null, string | null]>): Pedigree {
  return new Map(entries.map(([id, sireId, damId]) => [id, { sireId, damId }]));
}

test('COI: unrelated parents give zero', () => {
  const p = pedigree([
    ['S', 'A', 'B'],
    ['D', 'C', 'E'],
  ]);
  assert.ok(fractionsEqual(computeInbreeding(p, 'S', 'D').coefficient, ZERO));
});

test('COI: full sibling mating gives 1/4', () => {
  const p = pedigree([
    ['S', 'G', 'M'],
    ['D', 'G', 'M'],
  ]);
  assert.ok(fractionsEqual(computeInbreeding(p, 'S', 'D').coefficient, fraction(1n, 4n)));
});

test('COI: half sibling mating gives 1/8', () => {
  const p = pedigree([
    ['S', 'G', 'M1'],
    ['D', 'G', 'M2'],
  ]);
  assert.ok(fractionsEqual(computeInbreeding(p, 'S', 'D').coefficient, fraction(1n, 8n)));
});

test('COI: first cousin mating gives 1/16', () => {
  const p = pedigree([
    ['GF', null, null],
    ['GM', null, null],
    ['P1', 'GF', 'GM'],
    ['P2', 'GF', 'GM'],
    ['X', null, null],
    ['Y', null, null],
    ['S', 'P1', 'X'],
    ['D', 'Y', 'P2'],
  ]);
  const result = computeInbreeding(p, 'S', 'D');
  assert.ok(fractionsEqual(result.coefficient, fraction(1n, 16n)));
  assert.equal(result.cycleDetected, false);
});

test('COI: parent x child: paths through shared grandparents add up exactly', () => {
  const p = pedigree([
    ['G', null, null],
    ['M1', null, null],
    ['M2', null, null],
    ['SIB1', 'G', 'M1'],
    ['SIB2', 'G', 'M2'],
    ['A', 'SIB1', 'SIB2'],
  ]);
  const result = computeInbreeding(p, 'A', 'SIB1');
  assert.ok(fractionsEqual(result.coefficient, fraction(7n, 16n)));
});

test('COI: a cycle in the data terminates and is reported', () => {
  const p = pedigree([
    ['a', 'b', 'c'],
    ['b', 'a', null],
    ['c', null, null],
    ['d', null, null],
  ]);
  const result = computeInbreeding(p, 'a', 'd');
  assert.equal(result.cycleDetected, true);
});

test('spread: a spread carrier x normal gives 1/2 spread in each sex, not sex-linked', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { S: ['S', '+'] } },
    { sex: 'female', loci: { S: ['+', '+'] } }
  );
  for (const sex of ['male', 'female'] as Sex[]) {
    assert.ok(fractionsEqual(conditionalWithinSex(outcomes, sex, (o) => o.loci.S?.join('') === '+S'), HALF));
  }
  const spreadGroups = groupByPhenotype(outcomes).filter((g) => g.phenotype.S?.visible.code === 'S');
  assert.equal(spreadGroups.length, 2);
  assert.ok(spreadGroups.every((g) => g.phenotype.S?.split.length === 0));
});

test('dominant opal: lethal Od/Od is removed and the rest renormalised to sum to one', () => {
  const outcomes = offspringOutcomes(
    { sex: 'male', loci: { O: ['Od', '+'] } },
    { sex: 'female', loci: { O: ['Od', '+'] } }
  );
  assert.ok(outcomes.every((o) => o.loci.O?.join('/') !== 'Od/Od'));
  const total = outcomes.reduce((acc, o) => addFractions(acc, o.probability), ZERO);
  assert.ok(fractionsEqual(total, ONE));
  assert.ok(fractionsEqual(conditionalWithinSex(outcomes, 'female', (o) => o.loci.O?.join('') === '+Od'), fraction(2n, 3n)));
});

test('dominant opal x dominant opal lethal-only offspring is rejected', () => {
  assert.throws(() =>
    offspringOutcomes(
      { sex: 'male', loci: { O: ['Od', 'Od'] } },
      { sex: 'female', loci: { O: ['Od', 'Od'] } }
    )
  );
});

test('plain text: carriers show split alleles, wild type loci are omitted', () => {
  assert.equal(describeGenotype({ O: ['Od', 'o'], S: ['S', '+'] }, 'en'), 'dominant opal (split recessive opal), spread');
  assert.equal(describeGenotype({ e: ['E', 'E'], z: ['+', '+'] }, 'en'), 'wild type');
  assert.equal(describeGenotype({ e: ['E', 'e'] }, 'ro'), 'normal (purtători de roșu recesiv)');
});
