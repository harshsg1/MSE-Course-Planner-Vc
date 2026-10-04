export const PARSE_EQUIVALENTS_FIXTURES = [
  {
    input: "PHYS 126 or 121 or 102",
    expected: ["PHYS 126", "PHYS 121", "PHYS 102"],
  },
  {
    input: "MATH 150, 154 or 157",
    expected: ["MATH 150", "MATH 154", "MATH 157"],
  },
  {
    input: "CMPT 120, MACM 101",
    expected: ["CMPT 120", "MACM 101"],
  },
  {
    input: "MATH 150/151",
    expected: ["MATH 150", "MATH 151"],
  },
  {
    input:
      "Students with credit for SEE 222, ENSC 231 or ENSC 330 may not take MSE 220 for further credit.",
    expected: ["SEE 222", "ENSC 231", "ENSC 330"],
    selfCode: "MSE 220",
  },
] as const;
