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

/**
 * Story 4: Delete Draft Campaign
 *
 * Each AC block:
 *   ✅ Happy path  — valid deletion, expect 204
 *   ❌ Error/validation — invalid target, expect 4xx
 *   🔲 Edge case   — boundary / side-effect verification
 */
test.describe("Story 4: Delete Draft Campaign @mocked_api", () => {

  // ─────────────────────────────────────────────
  // AC: Can delete campaigns in 'draft' status only
  // ─────────────────────────────────────────────

  test("✅ [happy path] successfully deletes a draft campaign (204)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_draft", "draft")]);

    const res = await mockCampaignApi.delete("camp_draft");

    expect(res.status).toBe(204);
    expect(res.ok).toBe(true);
  });

  test("❌ [error] rejects deletion of an active campaign (422)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_active", "active")]);

    const res = await mockCampaignApi.delete("camp_active");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  test("🔲 [edge case] active campaign data is unchanged after failed deletion attempt", async ({ mockCampaignApi }) => {
    // Ensures the operation has no side effects when rejected
    mockCampaignApi.seed([makeCampaign("camp_active_safe", "active")]);

    await mockCampaignApi.delete("camp_active_safe"); // should fail

    const fetchRes = await mockCampaignApi.getById("camp_active_safe");
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.data.status).toBe("active");
    expect(fetchRes.data.budget).toBe(10000);
  });

  // ─────────────────────────────────────────────
  // AC: Cannot delete active or completed campaigns
  // ─────────────────────────────────────────────

  test("✅ [happy path] draft campaign is removed from the campaign list after deletion", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([
      makeCampaign("camp_keep", "active"),
      makeCampaign("camp_remove", "draft"),
    ]);

    await mockCampaignApi.delete("camp_remove");

    const listRes = await mockCampaignApi.list();
    const ids = listRes.data.campaigns.map((c) => c.id);
    expect(ids).not.toContain("camp_remove");
    expect(ids).toContain("camp_keep");
  });

  test("❌ [error] rejects deletion of a completed campaign (422)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_completed", "completed")]);

    const res = await mockCampaignApi.delete("camp_completed");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  test("🔲 [edge case] rejects deletion of a paused campaign (422) — paused is not draft", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_paused", "paused")]);

    const res = await mockCampaignApi.delete("camp_paused");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  // ─────────────────────────────────────────────
  // AC: Deletion is permanent (no soft delete)
  // ─────────────────────────────────────────────

  test("✅ [happy path] deleted campaign cannot be retrieved by ID (404)", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_gone", "draft")]);

    await mockCampaignApi.delete("camp_gone");
    const res = await mockCampaignApi.getById("camp_gone");

    expect(res.status).toBe(404);
  });

  test("❌ [error] returns 404 when deleting a non-existent campaign", async ({ mockCampaignApi }) => {
    const res = await mockCampaignApi.delete("camp_ghost");

    expect(res.status).toBe(404);
    expect(res.ok).toBe(false);
  });

  test("🔲 [edge case] deleted campaign does not reappear when a new campaign is created with the same name", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_original", "draft", { name: "Duplicate Name" })]);

    await mockCampaignApi.delete("camp_original");

    // Create a new campaign with the same name — should succeed and get a new ID
    const createRes = await mockCampaignApi.create({
      name: "Duplicate Name",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      budget: 5000,
      currency: "GBP",
    });

    expect(createRes.status).toBe(201);
    expect(createRes.data.id).not.toBe("camp_original");

    const listRes = await mockCampaignApi.list();
    expect(listRes.data.campaigns).toHaveLength(1);
    expect(listRes.data.campaigns[0].id).toBe(createRes.data.id);
  });

  // ─────────────────────────────────────────────
  // AC: Returns appropriate error for invalid deletions
  // ─────────────────────────────────────────────

  test("✅ [happy path] can delete multiple draft campaigns sequentially — list count reduces correctly", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([
      makeCampaign("camp_d1", "draft"),
      makeCampaign("camp_d2", "draft"),
      makeCampaign("camp_d3", "draft"),
    ]);

    await mockCampaignApi.delete("camp_d1");
    await mockCampaignApi.delete("camp_d2");

    const listRes = await mockCampaignApi.list();
    expect(listRes.data.campaigns).toHaveLength(1);
    expect(listRes.data.campaigns[0].id).toBe("camp_d3");
  });

  test("❌ [error] second deletion of the same campaign returns 404", async ({ mockCampaignApi }) => {
    mockCampaignApi.seed([makeCampaign("camp_once", "draft")]);

    await mockCampaignApi.delete("camp_once");        // first: 204
    const res = await mockCampaignApi.delete("camp_once"); // second: should 404

    expect(res.status).toBe(404);
  });

  test("🔲 [edge case] invalid country codes in target audience do not affect draft deletion", async ({ mockCampaignApi }) => {
    // Deletion rules are status-based only; malformed audience data is irrelevant
    mockCampaignApi.seed([
      makeCampaign("camp_bad_audience", "draft", {
        target_audience: { countries: ["XX", "ZZ", "INVALID"] },
      }),
    ]);

    const res = await mockCampaignApi.delete("camp_bad_audience");

    expect(res.status).toBe(204);
  });
});