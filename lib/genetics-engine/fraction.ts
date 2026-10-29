export interface Fraction {
  readonly num: bigint;
  readonly den: bigint;
}

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
};

export function fraction(num: bigint, den: bigint = 1n): Fraction {
  if (den === 0n) throw new Error('Fraction denominator cannot be zero');
  const sign = den < 0n ? -1n : 1n;
  const g = gcd(num, den) || 1n;
  return { num: (sign * num) / g, den: (sign * den) / g };
}

export const ZERO = fraction(0n);
export const ONE = fraction(1n);
export const HALF = fraction(1n, 2n);

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(a.num * b.num, a.den * b.den);
}

export function powerOfHalf(exponent: number): Fraction {
  return fraction(1n, 1n << BigInt(exponent));
}

export function isZero(f: Fraction): boolean {
  return f.num === 0n;
}

export function fractionsEqual(a: Fraction, b: Fraction): boolean {
  return a.num === b.num && a.den === b.den;
}

export function fractionToNumber(f: Fraction): number {
  return Number(f.num) / Number(f.den);
}
