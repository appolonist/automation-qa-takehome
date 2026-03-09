import { test, expect } from "../src/api/fixtures/campaignFixture";
import type { CreateCampaignPayload } from "../src/api/types";

const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
};

const yesterday = (): string => daysFromNow(-1);

const basePayload = (): CreateCampaignPayload => ({
  name: "Summer Sale 2026",
  start_date: daysFromNow(0),
  end_date: daysFromNow(30),
  budget: 50000,
  currency: "GBP",
});

/**
 * Story 1: Create Basic Campaign
 *
 * Each AC block follows the pattern:
 *   ✅ Happy path  — valid data, expect 201
 *   ❌ Error/validation — invalid data, expect 4xx
 *   🔲 Edge case   — boundary value from the data recommendations
 */
test.describe("Story 1: Create Basic Campaign @mocked_api", () => {

  // ─────────────────────────────────────────────
  // AC: Campaign must have a name (3–100 chars)
  // ─────────────────────────────────────────────

  test("✅ [happy path] creates campaign with valid name and required fields", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create(basePayload());

    expect(res.status).toBe(201);
    expect(res.ok).toBe(true);
    expect(res.data.name).toBe("Summer Sale 2026");
  });

  test("❌ [error] rejects campaign with empty name (400)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), name: "" });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("🔲 [edge case] accepts campaign name with exactly 100 characters", async ({ mockCampaignApi }) => {
    const name = "A".repeat(100);
    const res = await mockCampaignApi.create({ ...basePayload(), name });

    expect(res.status).toBe(201);
    expect(res.data.name).toHaveLength(100);
  });

  // ─────────────────────────────────────────────
  // AC: Budget must be positive
  // ─────────────────────────────────────────────

  test("✅ [happy path] creates campaign with standard budget", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), budget: 10000 });

    expect(res.status).toBe(201);
    expect(res.data.budget).toBe(10000);
  });

  test("❌ [error] rejects campaign with zero budget (400)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), budget: 0 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("🔲 [edge case] accepts campaign with minimum allowed budget (£0.01)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), budget: 0.01 });

    expect(res.status).toBe(201);
    expect(res.data.budget).toBe(0.01);
  });

  test("🔲 [edge case] accepts campaign with maximum allowed budget (£1,000,000)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), budget: 1_000_000 });

    expect(res.status).toBe(201);
    expect(res.data.budget).toBe(1_000_000);
  });

  // ─────────────────────────────────────────────
  // AC: Start date must be today or in the future
  // ─────────────────────────────────────────────

  test("✅ [happy path] accepts start_date set to today", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), start_date: daysFromNow(0) });

    expect(res.status).toBe(201);
  });

  test("❌ [error] rejects start_date in the past (400)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), start_date: yesterday() });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("🔲 [edge case] accepts start_date set to tomorrow (boundary of future)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({
      ...basePayload(),
      start_date: daysFromNow(1),
      end_date: daysFromNow(31),
    });

    expect(res.status).toBe(201);
  });

  // ─────────────────────────────────────────────
  // AC: End date must be after start date
  // ─────────────────────────────────────────────

  test("✅ [happy path] accepts end_date 30 days after start_date", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({
      ...basePayload(),
      start_date: daysFromNow(5),
      end_date: daysFromNow(35),
    });

    expect(res.status).toBe(201);
  });

  test("❌ [error] rejects end_date before start_date (422)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({
      ...basePayload(),
      start_date: daysFromNow(10),
      end_date: daysFromNow(5),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  test("🔲 [edge case] accepts a 24-hour campaign (start_date equals end_date date, different times)", async ({ mockCampaignApi }) => {
    // Start at 00:00, end at 23:59:59 of the same day — a valid single-day campaign
    const startDate = daysFromNow(5).replace("T00:00:00Z", "T00:00:00Z");
    const endDate = daysFromNow(5).replace("T00:00:00Z", "T23:59:59Z");
    const res = await mockCampaignApi.create({
      ...basePayload(),
      start_date: startDate,
      end_date: endDate,
    });

    expect(res.status).toBe(201);
  });

  // ─────────────────────────────────────────────
  // AC: Currency must be supported
  // ─────────────────────────────────────────────

  test("✅ [happy path] creates campaign with each supported currency", async ({ mockCampaignApi }) => {
    for (const currency of ["GBP", "USD", "EUR"] as const) {
      const res = await mockCampaignApi.create({ ...basePayload(), currency });
      expect(res.status).toBe(201);
      expect(res.data.currency).toBe(currency);
    }
  });

  test("❌ [error] rejects unsupported currency code (400)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({
      ...basePayload(),
      currency: "JPY" as any,
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("🔲 [edge case] creates campaign with empty optional description", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), description: "" });

    expect(res.status).toBe(201);
    // description is optional — absence or empty string both valid
    expect(res.data.id).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // AC: Campaign is created in 'draft' status by default
  // AC: System returns campaign ID upon successful creation
  // ─────────────────────────────────────────────

  test("✅ [happy path] new campaign defaults to draft with spend of 0", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create(basePayload());

    expect(res.data.status).toBe("draft");
    expect(res.data.spend).toBe(0);
    expect(res.data.id).toMatch(/^camp_/);
  });

  test("❌ [error] rejects negative budget (400)", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.create({ ...basePayload(), budget: -500 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  test("🔲 [edge case] each campaign created receives a unique ID", async ({ mockCampaignApi }) => {
    const [r1, r2, r3] = await Promise.all([
      mockCampaignApi.create(basePayload()),
      mockCampaignApi.create({ ...basePayload(), name: "Campaign Two" }),
      mockCampaignApi.create({ ...basePayload(), name: "Campaign Three" }),
    ]);
    const ids = [r1.data.id, r2.data.id, r3.data.id];

    expect(new Set(ids).size).toBe(3);
  });
});