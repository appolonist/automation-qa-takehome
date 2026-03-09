import { test, expect } from "../src/api/fixtures/campaignFixture";
import type { Campaign } from "../src/api/types";

const seedCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "camp_budget_test",
  name: "Budget Test Campaign",
  start_date: "2026-06-01T00:00:00Z",
  end_date: "2026-08-31T23:59:59Z",
  budget: 10000,
  currency: "GBP",
  spend: 3000,
  status: "active",
  target_audience: {},
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...overrides,
});

/**
 * Story 2: Update Campaign Budget
 *
 * Each AC block:
 *   ✅ Happy path  — valid update, expect 200
 *   ❌ Error/validation — violates business rule, expect 4xx
 *   🔲 Edge case   — boundary value from the data recommendations
 */
test.describe("Story 2: Update Campaign Budget @mocked_api", () => {

  // ─────────────────────────────────────────────
  // AC: Can increase budget at any time
  // ─────────────────────────────────────────────

  test("✅ [happy path] increases budget on active campaign", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 20000 });

    expect(res.status).toBe(200);
    expect(res.data.budget).toBe(20000);
  });

  test("❌ [error] returns 404 when updating budget of non-existent campaign", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.update("camp_ghost", { budget: 20000 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  test("🔲 [edge case] can increase budget to maximum allowed value (£1,000,000)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 1_000_000 });

    expect(res.status).toBe(200);
    expect(res.data.budget).toBe(1_000_000);
  });

  // ─────────────────────────────────────────────
  // AC: Can decrease budget if new amount is above current spend
  // ─────────────────────────────────────────────

  test("✅ [happy path] decreases budget to value clearly above current spend", async ({ mockCampaignApi }) => {
    // spend = 3000; decreasing to 5000 is valid
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 5000 });

    expect(res.status).toBe(200);
    expect(res.data.budget).toBe(5000);
  });

  test("❌ [error] rejects decreasing budget below current spend (422)", async ({ mockCampaignApi }) => {
    // spend = 3000; new budget 1000 < 3000
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 1000 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  test("🔲 [edge case] rejects budget equal to current spend — no headroom (422)", async ({ mockCampaignApi }) => {
    // spend = 3000; budget = 3000 is AT spend, not above it
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 3000 });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  // ─────────────────────────────────────────────
  // AC: Cannot reduce budget below current spend
  // ─────────────────────────────────────────────

  test("✅ [happy path] can decrease budget to £1 above current spend", async ({ mockCampaignApi }) => {
    // spend = 3000; 3001 is the minimum valid decrease
    mockCampaignApi.seed([seedCampaign()]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 3001 });

    expect(res.status).toBe(200);
    expect(res.data.budget).toBe(3001);
  });

  test("❌ [error] rejects reducing budget to zero regardless of spend (400)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([seedCampaign({ spend: 0 })]);

    const res = await mockCampaignApi.update("camp_budget_test", { budget: 0 });

    expect(res.ok).toBe(false);
    expect([400, 422]).toContain(res.status);
  });

  test("🔲 [edge case] can reduce to minimum budget (£0.01) when spend is zero", async ({ mockCampaignApi }) => {
    // No spend yet — any positive budget is valid
    mockCampaignApi.seed([seedCampaign({ id: "camp_no_spend", spend: 0, budget: 10000 })]);

    const res = await mockCampaignApi.update("camp_no_spend", { budget: 0.01 });

    expect(res.status).toBe(200);
    expect(res.data.budget).toBe(0.01);
  });

  // ─────────────────────────────────────────────
  // AC: Budget updates are logged in audit trail
  // ─────────────────────────────────────────────

  test("✅ [happy path] budget increase is recorded in call log with correct payload", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([seedCampaign()]);

    await mockCampaignApi.update("camp_budget_test", { budget: 20000 });

    expect(mockCampaignApi.wasCalled("update")).toBe(true);
    const [loggedId, loggedPayload] = mockCampaignApi.calls.update[0] as [string, object];
    expect(loggedId).toBe("camp_budget_test");
    expect(loggedPayload).toMatchObject({ budget: 20000 });
  });

  test("❌ [error] failed budget update (below spend) is still logged in audit trail", async ({ mockCampaignApi }) => {
    // Even rejected calls should be traceable
    mockCampaignApi.seed([seedCampaign()]);

    await mockCampaignApi.update("camp_budget_test", { budget: 100 }); // will fail

    expect(mockCampaignApi.callCount("update")).toBe(1);
    const [, loggedPayload] = mockCampaignApi.calls.update[0] as [string, { budget: number }];
    expect(loggedPayload.budget).toBe(100);
  });

  test("🔲 [edge case] multiple sequential budget updates each appear in the audit trail", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([seedCampaign()]);

    await mockCampaignApi.update("camp_budget_test", { budget: 12000 });
    await mockCampaignApi.update("camp_budget_test", { budget: 15000 });
    await mockCampaignApi.update("camp_budget_test", { budget: 20000 });

    expect(mockCampaignApi.callCount("update")).toBe(3);

    const budgets = mockCampaignApi.calls.update.map(([, p]) => (p as { budget: number }).budget);
    expect(budgets).toEqual([12000, 15000, 20000]);
  });
});