/** K, M, B, T 다음에는 aa, ab, ..., az, ba, ... zz 순서로 단위를 붙인다. (방치형 게임의 관례) */
const UNITS: string[] = ['', 'K', 'M', 'B', 'T'];
for (let i = 0; i < 26; i++) {
  for (let j = 0; j < 26; j++) {
    UNITS.push(String.fromCharCode(97 + i) + String.fromCharCode(97 + j));
  }
}

/**
 * 큰 숫자를 짧게 표시한다. 1234 → "1.23K", 5_600_000 → "5.60M"
 * 방치형 게임은 숫자가 금방 수십 자리가 되기 때문에 꼭 필요하다.
 * 1000으로 나눈 횟수(= 자릿수 / 3)가 단위 번호가 된다.
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toString();
  const unit = Math.min(Math.floor(Math.log10(n) / 3), UNITS.length - 1);
  const value = n / Math.pow(1000, unit);
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return value.toFixed(digits) + UNITS[unit];
}
