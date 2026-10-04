import { extractCourseCodes, parseEquivalents } from "./parseEquivalents";
import { PARSE_EQUIVALENTS_FIXTURES } from "./parseEquivalents.fixtures";

function assertCodes(actual: string[], expected: string[]): void {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();

  if (
    sortedActual.length !== sortedExpected.length ||
    sortedActual.some((code, index) => code !== sortedExpected[index])
  ) {
    throw new Error(
      `Expected [${sortedExpected.join(", ")}] but got [${sortedActual.join(", ")}]`
    );
  }
}

let passed = 0;

for (const fixture of PARSE_EQUIVALENTS_FIXTURES) {
  const result = fixture.selfCode
    ? parseEquivalents(fixture.input, fixture.selfCode).map((item) => item.code)
    : extractCourseCodes(fixture.input).map((item) => item.code);

  assertCodes(result, [...fixture.expected]);
  passed += 1;
  console.log(`✓ ${fixture.input}`);
}

console.log(`\n${passed}/${PARSE_EQUIVALENTS_FIXTURES.length} parseEquivalents tests passed.`);
