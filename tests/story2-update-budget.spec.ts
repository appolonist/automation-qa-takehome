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

test.describe("Story 2: Update Campaign Budget @mocked_api", () => {

  test.describe("Can increase budget at any time", () => {
    test("increases budget on active campaign @successful", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 200;
      const expectedBudget = 20000;
      const campaignId = "camp_budget_test";

      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("returns 404 when updating budget of non-existent campaign @negative", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 404;
      const nonExistentId = "camp_ghost";
      const newBudget = 20000;

      // Act
      const res = await mockCampaignApi.update(nonExistentId, { budget: newBudget });

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("can increase budget to maximum allowed value (£1,000,000) @edge_case", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 200;
      const expectedBudget = 1_000_000;
      const campaignId = "camp_budget_test";

      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });
  });

  test.describe("Can decrease budget if new amount is above current spend", () => {
    test("decreases budget to value clearly above current spend @successful", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 200;
      const expectedBudget = 5000;
      const campaignId = "camp_budget_test";

      // spend = 3000; increasing to 5000 is valid
      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("rejects decreasing budget below current spend (422) @negative", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 422;
      const invalidBudget = 1000;
      const campaignId = "camp_budget_test";

      // spend = 3000; new budget 1000 < 3000
      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: invalidBudget });

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("rejects budget equal to current spend — no headroom (422) @edge_case", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 422;
      const budgetEqualToSpend = 3000;
      const campaignId = "camp_budget_test";

      // spend = 3000; budget = 3000 is AT spend, not above it
      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: budgetEqualToSpend });

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });
  });

  test.describe("Cannot reduce budget below current spend", () => {
    test("can decrease budget to £1 above current spend @successful", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 200;
      const expectedBudget = 3001;
      const campaignId = "camp_budget_test";

      // spend = 3000; 3001 is the minimum valid decrease
      mockCampaignApi.seed([seedCampaign()]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("rejects reducing budget to zero regardless of spend (400) @negative", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatuses = [400, 422];
      const zeroBudget = 0;
      const campaignId = "camp_budget_test";

      mockCampaignApi.seed([seedCampaign({ spend: 0 })]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: zeroBudget });

      // Assert
      expect(res.ok).toBe(false);
      expect(expectedStatuses).toContain(res.status);
    });

    test("can reduce to minimum budget (£0.01) when spend is zero @edge_case", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedStatus = 200;
      const expectedBudget = 0.01;
      const campaignId = "camp_no_spend";

      // No spend yet — any positive budget is valid
      mockCampaignApi.seed([seedCampaign({ id: campaignId, spend: 0, budget: 10000 })]);

      // Act
      const res = await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });
  });

  test.describe("Budget updates are logged in audit trail", () => {
    test("budget increase is recorded in call log with correct payload @successful", async ({ mockCampaignApi }) => {
      // Arrange
      const expectedBudget = 20000;
      const campaignId = "camp_budget_test";

      mockCampaignApi.seed([seedCampaign()]);

      // Act
      await mockCampaignApi.update(campaignId, { budget: expectedBudget });

      // Assert
      expect(mockCampaignApi.wasCalled("update")).toBe(true);
      const [loggedId, loggedPayload] = mockCampaignApi.calls.update[0] as [string, object];
      expect(loggedId).toBe(campaignId);
      expect(loggedPayload).toMatchObject({ budget: expectedBudget });
    });

    test("failed budget update (below spend) is still logged in audit trail @negative", async ({ mockCampaignApi }) => {
      // Arrange
      const failedBudget = 100;
      const expectedCallCount = 1;
      const campaignId = "camp_budget_test";

      // Even rejected calls should be traceable
      mockCampaignApi.seed([seedCampaign()]);

      // Act
      await mockCampaignApi.update(campaignId, { budget: failedBudget }); // will fail

      // Assert
      expect(mockCampaignApi.callCount("update")).toBe(expectedCallCount);
      const [, loggedPayload] = mockCampaignApi.calls.update[0] as [string, { budget: number }];
      expect(loggedPayload.budget).toBe(failedBudget);
    });

    test("multiple sequential budget updates each appear in the audit trail @edge_case", async ({ mockCampaignApi }) => {
      // Arrange
      const budgets = [12000, 15000, 20000];
      const expectedCallCount = 3;
      const campaignId = "camp_budget_test";

      mockCampaignApi.seed([seedCampaign()]);

      // Act
      for (const budget of budgets) {
        await mockCampaignApi.update(campaignId, { budget });
      }

      // Assert
      expect(mockCampaignApi.callCount("update")).toBe(expectedCallCount);
      const loggedBudgets = mockCampaignApi.calls.update.map(([, p]) => (p as { budget: number }).budget);
      expect(loggedBudgets).toEqual(budgets);
    });
  });
});