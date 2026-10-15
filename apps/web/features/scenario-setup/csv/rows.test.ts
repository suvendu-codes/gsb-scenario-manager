import { describe, expect, it } from "vitest";

import { describeRows, formatRows } from "./rows";

describe("formatRows", () => {
  it("names a single row", () => {
    expect(formatRows([7])).toBe("row 7");
  });

  it("joins neighbouring lines into ranges", () => {
    expect(formatRows([3, 4, 5, 9, 12, 13])).toBe("rows 3-5, 9, 12-13");
  });

  it("sorts lines and ignores duplicates", () => {
    expect(formatRows([9, 3, 4, 4, 3])).toBe("rows 3-4, 9");
  });

  it("shortens long lists with an ellipsis", () => {
    expect(formatRows([2, 4, 6, 8, 10, 12])).toBe("rows 2, 4, 6, 8, …");
  });
});

describe("describeRows", () => {
  it("puts the rows, the problem and the count together", () => {
    expect(describeRows([4, 9, 10], '"qty" is blank')).toBe(
      'rows 4, 9-10: "qty" is blank (3 rows)',
    );
  });

  it("leaves out the count for a single row", () => {
    expect(describeRows([4], '"qty" is blank')).toBe('row 4: "qty" is blank');
  });
});
