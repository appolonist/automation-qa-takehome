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

test.describe("Story 1: Create Basic Campaign @mocked_api", () => {

  test.describe("Campaign must have a name (3-100 chars)", () => {
    test("creates campaign with valid name and required fields @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedName = "Summer Sale 2026";

      // Arrange
      const payload = basePayload();

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.ok).toBe(true);
      expect(res.data.name).toBe(expectedName);
    });

    test("rejects campaign with empty name (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;
      const emptyName = "";

      // Arrange
      const payload = { ...basePayload(), name: emptyName };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("accepts campaign name with exactly 100 characters @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedLength = 100;
      const name = "A".repeat(expectedLength);

      // Arrange
      const payload = { ...basePayload(), name };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.name).toHaveLength(expectedLength);
    });
  });

  test.describe("Budget must be positive", () => {
    test("creates campaign with standard budget @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedBudget = 10000;

      // Arrange
      const payload = { ...basePayload(), budget: expectedBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("rejects campaign with zero budget (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;
      const invalidBudget = 0;

      // Arrange
      const payload = { ...basePayload(), budget: invalidBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("accepts campaign with minimum allowed budget (£0.01) @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedBudget = 0.01;

      // Arrange
      const payload = { ...basePayload(), budget: expectedBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("accepts campaign with maximum allowed budget (£1,000,000) @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedBudget = 1_000_000;

      // Arrange
      const payload = { ...basePayload(), budget: expectedBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.data.budget).toBe(expectedBudget);
    });

    test("rejects negative budget (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;
      const negativeBudget = -500;

      // Arrange
      const payload = { ...basePayload(), budget: negativeBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });
  });

  test.describe("Start date must be today or in the future", () => {
    test("accepts start_date set to today @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;

      // Arrange
      const payload = { ...basePayload(), start_date: daysFromNow(0) };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
    });

    test("rejects start_date in the past (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;

      // Arrange
      const payload = { ...basePayload(), start_date: yesterday() };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("accepts start_date set to tomorrow (boundary of future) @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;

      // Arrange
      const payload = {
        ...basePayload(),
        start_date: daysFromNow(1),
        end_date: daysFromNow(31),
      };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
    });
  });

  test.describe("End date must be after start date", () => {
    test("accepts end_date 30 days after start_date @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;

      // Arrange
      const payload = {
        ...basePayload(),
        start_date: daysFromNow(5),
        end_date: daysFromNow(35),
      };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
    });

    test("rejects end_date before start_date (422) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 422;

      // Arrange
      const payload = {
        ...basePayload(),
        start_date: daysFromNow(10),
        end_date: daysFromNow(5),
      };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("accepts a 24-hour campaign (start_date equals end_date date, different times) @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;

      // Arrange
      const startDate = daysFromNow(5).replace("T00:00:00Z", "T00:00:00Z");
      const endDate = daysFromNow(5).replace("T00:00:00Z", "T23:59:59Z");
      const payload = {
        ...basePayload(),
        start_date: startDate,
        end_date: endDate,
      };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
    });
  });

  test.describe("Currency must be supported", () => {
    test("creates campaign with each supported currency @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const supportedCurrencies = ["GBP", "USD", "EUR"] as const;

      // Arrange & Act & Assert
      for (const currency of supportedCurrencies) {
        const payload = { ...basePayload(), currency };
        const res = await mockCampaignApi.create(payload);
        expect(res.status).toBe(expectedStatus);
        expect(res.data.currency).toBe(currency);
      }
    });

    test("rejects unsupported currency code (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;
      const unsupportedCurrency = "JPY";

      // Arrange
      const payload = {
        ...basePayload(),
        currency: unsupportedCurrency as any,
      };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("creates campaign with empty optional description @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const emptyDescription = "";

      // Arrange
      const payload = { ...basePayload(), description: emptyDescription };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.status).toBe(expectedStatus);
      // description is optional — absence or empty string both valid
      expect(res.data.id).toBeDefined();
    });
  });

  test.describe("Campaign is created in 'draft' status by default + System returns campaign ID upon successful creation", () => {
    test("new campaign defaults to draft with spend of 0 @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedDraftStatus = "draft";
      const expectedSpend = 0;
      const expectedIdPattern = /^camp_/;

      // Arrange
      const payload = basePayload();

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.data.status).toBe(expectedDraftStatus);
      expect(res.data.spend).toBe(expectedSpend);
      expect(res.data.id).toMatch(expectedIdPattern);
    });

    test("rejects negative budget (400) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 400;
      const negativeBudget = -500;

      // Arrange
      const payload = { ...basePayload(), budget: negativeBudget };

      // Act
      const res = await mockCampaignApi.create(payload);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("each campaign created receives a unique ID @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 201;
      const expectedUniqueCount = 3;

      // Arrange
      const payloads = [
        basePayload(),
        { ...basePayload(), name: "Campaign Two" },
        { ...basePayload(), name: "Campaign Three" },
      ];

      // Act
      const [r1, r2, r3] = await Promise.all(payloads.map(p => mockCampaignApi.create(p)));
      const ids = [r1.data.id, r2.data.id, r3.data.id];

      // Assert
      expect(new Set(ids).size).toBe(expectedUniqueCount);
    });
  });
});