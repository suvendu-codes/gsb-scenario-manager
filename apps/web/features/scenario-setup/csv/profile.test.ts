import { describe, expect, it } from "vitest";

import { parseCsv } from "./parse";
import { computeProfile } from "./profile";

const lines = (...rows: string[]): string => rows.join("\n");

describe("computeProfile: inbound", () => {
  const header = "receipt_id,dock_door,sku,qty,uom,eta";

  it("adds up units per hour from the eta column", () => {
    const parsed = parseCsv(
      lines(header, "R1,D,S1,100,EA,08:00", "R2,D,S2,50,EA,08:45", "R3,D,S3,30,EA,13:10"),
    );

    const { hourly } = computeProfile("inbound", parsed);

    expect(hourly).toHaveLength(24);
    expect(hourly?.[8]).toBe(150);
    expect(hourly?.[13]).toBe(30);
    expect(hourly?.reduce((a, b) => a + b, 0)).toBe(180);
  });

  it("skips rows with an invalid time or quantity", () => {
    const parsed = parseCsv(
      lines(header, "R1,D,S1,100,EA,99:00", "R2,D,S2,-5,EA,08:00", "R3,D,S3,abc,EA,08:00"),
    );

    expect(computeProfile("inbound", parsed).hourly?.every((value) => value === 0)).toBe(true);
  });
});

describe("computeProfile: outbound", () => {
  const header = "order_id,line_no,sku,priority,order_type,pbt,pat,qty,uom";

  it("counts each order once at its first pick-by hour, plus line and unit totals", () => {
    const parsed = parseCsv(
      lines(
        header,
        "O1,1,S1,Std,Pick,09:00,12:00,4,EA",
        "O1,2,S2,Std,Pick,09:00,12:00,2,EA",
        "O2,1,S1,Std,Pick,10:30,14:00,6,EA",
      ),
    );

    const profile = computeProfile("outbound", parsed);

    expect(profile.hourly?.[9]).toBe(1);
    expect(profile.hourly?.[10]).toBe(1);
    expect(profile.hourly?.reduce((a, b) => a + b, 0)).toBe(2);
    expect(profile.totalOrderlines).toBe(3);
    expect(profile.totalUnits).toBe(12);
  });

  it("ignores rows without an order id", () => {
    const parsed = parseCsv(lines(header, ",1,S1,Std,Pick,09:00,12:00,4,EA"));

    expect(computeProfile("outbound", parsed).totalOrderlines).toBe(0);
  });
});

describe("computeProfile: master data and mock put", () => {
  const header = "sku,bin_location,velocity_class,on_hand,capacity,bin_tag";

  it("adds on-hand and capacity per velocity class, in Fast, Medium, Slow order", () => {
    const parsed = parseCsv(
      lines(
        header,
        "S1,A,slow,10,20,x",
        "S2,A,Fast,100,150,x",
        "S3,A,FAST,50,50,x",
        "S4,A,Turbo,99,99,x",
      ),
    );

    expect(computeProfile("masterdata", parsed).velocity).toEqual([
      { label: "Fast", onHand: 150, capacity: 200 },
      { label: "Slow", onHand: 10, capacity: 20 },
    ]);
  });

  it("has nothing to chart for mock put", () => {
    expect(
      computeProfile("mockput", parseCsv("put_zone,carrier_type,capacity,priority\nP,T,1,1")),
    ).toEqual({});
  });
});
