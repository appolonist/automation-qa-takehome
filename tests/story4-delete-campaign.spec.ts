import { test, expect } from "../src/api/fixtures/campaignFixture";
import type { Campaign } from "../src/api/types";

const makeCampaign = (id: string, status: Campaign["status"], overrides: Partial<Campaign> = {}): Campaign => ({
  id,
  name: `Campaign ${id}`,
  start_date: "2026-06-01T00:00:00Z",
  end_date: "2026-08-31T23:59:59Z",
  budget: 10000,
  currency: "GBP",
  spend: status === "active" ? 2500 : 0,
  status,
  target_audience: {},
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  ...overrides,
});

test.describe("Story 4: Delete Draft Campaign @mocked_api", () => {

  test.describe("Can delete campaigns in 'draft' status only", () => {
    test("successfully deletes a draft campaign (204) @successful", async ({ mockCampaignApi }) => {
      const expectedStatus = 204;
      const campaignId = "camp_draft";
      const campaignStatus = "draft";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      const res = await mockCampaignApi.delete(campaignId);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.ok).toBe(true);
    });

    test("rejects deletion of an active campaign (422) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 422;
      const campaignId = "camp_active";
      const campaignStatus = "active";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      const res = await mockCampaignApi.delete(campaignId);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("active campaign data is unchanged after failed deletion attempt @edge_case", async ({ mockCampaignApi }) => {
      const expectedGetStatus = 200;
      const expectedCampaignStatus = "active";
      const expectedBudget = 10000;
      const campaignId = "camp_active_safe";
      const campaignStatus = "active";

      // Arrange
      // Ensures the operation has no side effects when rejected
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      await mockCampaignApi.delete(campaignId); // should fail
      const fetchRes = await mockCampaignApi.getById(campaignId);

      // Assert
      expect(fetchRes.status).toBe(expectedGetStatus);
      expect(fetchRes.data.status).toBe(expectedCampaignStatus);
      expect(fetchRes.data.budget).toBe(expectedBudget);
    });
  });

  test.describe("Cannot delete active or completed campaigns", () => {
    test("draft campaign is removed from the campaign list after deletion @successful", async ({ mockCampaignApi }) => {
      const expectedGetStatus = 200;
      const keepCampaignId = "camp_keep";
      const removeCampaignId = "camp_remove";
      const keepStatus = "active";
      const removeStatus = "draft";

      // Arrange
      mockCampaignApi.seed([
        makeCampaign(keepCampaignId, keepStatus),
        makeCampaign(removeCampaignId, removeStatus),
      ]);

      // Act
      await mockCampaignApi.delete(removeCampaignId);
      const listRes = await mockCampaignApi.list();
      const ids = listRes.data.campaigns.map((c) => c.id);

      // Assert
      expect(ids).not.toContain(removeCampaignId);
      expect(ids).toContain(keepCampaignId);
    });

    test("rejects deletion of a completed campaign (422) @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 422;
      const campaignId = "camp_completed";
      const campaignStatus = "completed";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      const res = await mockCampaignApi.delete(campaignId);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });

    test("rejects deletion of a paused campaign (422) — paused is not draft @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 422;
      const campaignId = "camp_paused";
      const campaignStatus = "paused";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      const res = await mockCampaignApi.delete(campaignId);

      // Assert
      expect(res.ok).toBe(false);
      expect(res.status).toBe(expectedStatus);
    });
  });

  test.describe("Deletion is permanent (no soft delete)", () => {
    test("deleted campaign cannot be retrieved by ID (404) @successful", async ({ mockCampaignApi }) => {
      const expectedDeleteStatus = 204;
      const expectedGetStatus = 404;
      const campaignId = "camp_gone";
      const campaignStatus = "draft";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      await mockCampaignApi.delete(campaignId);
      const res = await mockCampaignApi.getById(campaignId);

      // Assert
      expect(res.status).toBe(expectedGetStatus);
    });

    test("returns 404 when deleting a non-existent campaign @negative", async ({ mockCampaignApi }) => {
      const expectedStatus = 404;
      const nonExistentId = "camp_ghost";

      // Act
      const res = await mockCampaignApi.delete(nonExistentId);

      // Assert
      expect(res.status).toBe(expectedStatus);
      expect(res.ok).toBe(false);
    });

    test("deleted campaign does not reappear when a new campaign is created with the same name @edge_case", async ({ mockCampaignApi }) => {
      const expectedCreateStatus = 201;
      const expectedListLength = 1;
      const originalCampaignId = "camp_original";
      const duplicateName = "Duplicate Name";
      const campaignStatus = "draft";

      // Arrange
      mockCampaignApi.seed([makeCampaign(originalCampaignId, campaignStatus, { name: duplicateName })]);

      // Act
      await mockCampaignApi.delete(originalCampaignId);

      // Create a new campaign with the same name — should succeed and get a new ID
      const createRes = await mockCampaignApi.create({
        name: duplicateName,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        budget: 5000,
        currency: "GBP",
      });

      const listRes = await mockCampaignApi.list();

      // Assert
      expect(createRes.status).toBe(expectedCreateStatus);
      expect(createRes.data.id).not.toBe(originalCampaignId);
      expect(listRes.data.campaigns).toHaveLength(expectedListLength);
      expect(listRes.data.campaigns[0].id).toBe(createRes.data.id);
    });
  });

  test.describe("Returns appropriate error for invalid deletions", () => {
    test("can delete multiple draft campaigns sequentially — list count reduces correctly @successful", async ({ mockCampaignApi }) => {
      const expectedListLength = 1;
      const campaignsToDelete = ["camp_d1", "camp_d2"];
      const campaignToKeep = "camp_d3";
      const campaignStatus = "draft";

      // Arrange
      mockCampaignApi.seed([
        makeCampaign(campaignsToDelete[0], campaignStatus),
        makeCampaign(campaignsToDelete[1], campaignStatus),
        makeCampaign(campaignToKeep, campaignStatus),
      ]);

      // Act
      for (const campaignId of campaignsToDelete) {
        await mockCampaignApi.delete(campaignId);
      }
      const listRes = await mockCampaignApi.list();

      // Assert
      expect(listRes.data.campaigns).toHaveLength(expectedListLength);
      expect(listRes.data.campaigns[0].id).toBe(campaignToKeep);
    });

    test("second deletion of the same campaign returns 404 @negative", async ({ mockCampaignApi }) => {
      const expectedFirstStatus = 204;
      const expectedSecondStatus = 404;
      const campaignId = "camp_once";
      const campaignStatus = "draft";

      // Arrange
      mockCampaignApi.seed([makeCampaign(campaignId, campaignStatus)]);

      // Act
      await mockCampaignApi.delete(campaignId);        // first: 204
      const res = await mockCampaignApi.delete(campaignId); // second: should 404

      // Assert
      expect(res.status).toBe(expectedSecondStatus);
    });

    test("invalid country codes in target audience do not affect draft deletion @edge_case", async ({ mockCampaignApi }) => {
      const expectedStatus = 204;
      const campaignId = "camp_bad_audience";
      const campaignStatus = "draft";
      const invalidCountries = ["XX", "ZZ", "INVALID"];

      // Arrange
      // Deletion rules are status-based only; malformed audience data is irrelevant
      mockCampaignApi.seed([
        makeCampaign(campaignId, campaignStatus, {
          target_audience: { countries: invalidCountries },
        }),
      ]);

      // Act
      const res = await mockCampaignApi.delete(campaignId);

      // Assert
      expect(res.status).toBe(expectedStatus);
    });
  });
});