import type {
  ApiResponse, Campaign, CreateCampaignPayload, UpdateCampaignPayload,
  ListCampaignsParams, PaginatedCampaigns, Creative, AddCreativePayload,
  CampaignAnalytics, AnalyticsParams,
} from "./types";

type CallLog = Record<string, unknown[][]>;

const ok = <T>(data: T, status = 200): ApiResponse<T> => ({ data, status, ok: true });
const fail = <T>(status: number, data?: any): ApiResponse<T> => ({ data, status, ok: false });

let idSeq = 1;
const newId = (prefix: string) => `${prefix}_${(idSeq++).toString(36)}`;
const now = () => new Date().toISOString();

export class MockCampaignApiClient {
  private campaigns = new Map<string, Campaign>();
  private creatives = new Map<string, Creative[]>();

  calls: CallLog = {
    create: [], getById: [], update: [], list: [], delete: [],
    addCreative: [], getAnalytics: [],
  };

  // ─── Overrides ──────────────────────────────────────────
  overrides: Partial<{
    create: (p: CreateCampaignPayload) => Promise<ApiResponse<Campaign>>;
    getById: (id: string) => Promise<ApiResponse<Campaign>>;
    update: (id: string, p: UpdateCampaignPayload) => Promise<ApiResponse<Campaign>>;
    list: (p?: ListCampaignsParams) => Promise<ApiResponse<PaginatedCampaigns>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
    addCreative: (id: string, p: AddCreativePayload) => Promise<ApiResponse<Creative>>;
    getAnalytics: (id: string, p?: AnalyticsParams) => Promise<ApiResponse<CampaignAnalytics>>;
  }> = {};

  // ─── CRUD ────────────────────────────────────────────────
  async create(payload: CreateCampaignPayload): Promise<ApiResponse<Campaign>> {
    this.calls.create.push([payload]);
    if (this.overrides.create) return this.overrides.create(payload);

    if (!payload.name || payload.name.length < 3)
      return fail(400, { error: "name must be at least 3 characters" });
    if (new Date(payload.start_date) < new Date(new Date().toISOString().split('T')[0]))
      return fail(400, { error: "start_date must be today or in the future" });
    if (new Date(payload.end_date) <= new Date(payload.start_date))
      return fail(422, { error: "end_date must be after start_date" });
    if (payload.budget < 0.01 || payload.budget > 1_000_000)
      return fail(400, { error: "budget out of range" });
    const supportedCurrencies = ["GBP", "USD", "EUR"];
    if (!supportedCurrencies.includes(payload.currency))
      return fail(400, { error: "unsupported currency code" });

    const campaign: Campaign = {
      id: newId("camp"),
      spend: 0,
      status: "draft",
      target_audience: {},
      created_at: now(),
      updated_at: now(),
      ...payload,
    };
    this.campaigns.set(campaign.id, campaign);
    return ok(campaign, 201);
  }

  async getById(id: string): Promise<ApiResponse<Campaign>> {
    this.calls.getById.push([id]);
    if (this.overrides.getById) return this.overrides.getById(id);
    const c = this.campaigns.get(id);
    return c ? ok(c) : fail(404, { error: "Campaign not found" });
  }

  async update(id: string, payload: UpdateCampaignPayload): Promise<ApiResponse<Campaign>> {
    this.calls.update.push([id, payload]);
    if (this.overrides.update) return this.overrides.update(id, payload);
    const c = this.campaigns.get(id);
    if (!c) return fail(404, { error: "Campaign not found" });
    if (payload.budget !== undefined && payload.budget === 0)
      return fail(400, { error: "budget must be greater than zero" });
    if (payload.budget !== undefined && payload.budget <= c.spend)
      return fail(422, { error: "Cannot reduce budget below current spend" });

    const updated: Campaign = { ...c, ...payload, updated_at: now() };
    this.campaigns.set(id, updated);
    return ok(updated);
  }

  async list(params?: ListCampaignsParams): Promise<ApiResponse<PaginatedCampaigns>> {
    this.calls.list.push([params ?? {}]);
    if (this.overrides.list) return this.overrides.list(params);

    let items = Array.from(this.campaigns.values());
    if (params?.status) items = items.filter((c) => c.status === params.status);

    // Sorting
    const sort = params?.sort ?? "created_at";
    const order = params?.order ?? "asc";
    items.sort((a, b) => {
      const av = a[sort as keyof Campaign] as any;
      const bv = b[sort as keyof Campaign] as any;
      return order === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    // Pagination
    const perPage = Math.min(params?.per_page ?? 25, 100);
    const page = params?.page ?? 1;
    const total = items.length;
    const paginated = items.slice((page - 1) * perPage, page * perPage);

    return ok({
      campaigns: paginated,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / perPage),
        total_count: total,
        per_page: perPage,
      },
    });
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    this.calls.delete.push([id]);
    if (this.overrides.delete) return this.overrides.delete(id);
    const c = this.campaigns.get(id);
    if (!c) return fail(404, { error: "Campaign not found" });
    if (c.status !== "draft")
      return fail(422, { error: "Can only delete draft campaigns" });
    this.campaigns.delete(id);
    return ok(undefined as any, 204);
  }

  async addCreative(campaignId: string, payload: AddCreativePayload): Promise<ApiResponse<Creative>> {
    this.calls.addCreative.push([campaignId, payload]);
    if (this.overrides.addCreative) return this.overrides.addCreative(campaignId, payload);
    if (!this.campaigns.has(campaignId)) return fail(404, { error: "Campaign not found" });
    if (!payload.video_url.startsWith("https://"))
      return fail(400, { error: "video_url must be HTTPS" });
    if (payload.duration_seconds < 5 || payload.duration_seconds > 120)
      return fail(400, { error: "duration_seconds must be 5–120" });

    const creative: Creative = {
      id: newId("cre"),
      campaign_id: campaignId,
      status: "pending_review",
      created_at: now(),
      ...payload,
    };
    const existing = this.creatives.get(campaignId) ?? [];
    this.creatives.set(campaignId, [...existing, creative]);
    return ok(creative, 201);
  }

  async getAnalytics(campaignId: string, params?: AnalyticsParams): Promise<ApiResponse<CampaignAnalytics>> {
    this.calls.getAnalytics.push([campaignId, params ?? {}]);
    if (this.overrides.getAnalytics) return this.overrides.getAnalytics(campaignId, params);
    if (!this.campaigns.has(campaignId)) return fail(404, { error: "Campaign not found" });

    // Return plausible stub analytics
    const analytics: CampaignAnalytics = {
      campaign_id: campaignId,
      date_range: {
        start: params?.start_date ?? "2026-06-01T00:00:00Z",
        end: params?.end_date ?? "2026-06-07T23:59:59Z",
      },
      summary: {
        impressions: 125000, clicks: 2500,
        click_through_rate: 0.02, spend: 1250.0, cost_per_click: 0.5,
      },
      daily_breakdown: [
        { date: "2026-06-01", impressions: 15000, clicks: 300, spend: 150.0 },
        { date: "2026-06-02", impressions: 18000, clicks: 360, spend: 180.0 },
      ],
    };
    return ok(analytics);
  }

  // ─── Test helpers ────────────────────────────────────────
  seed(campaigns: Campaign[]) {
    campaigns.forEach((c) => this.campaigns.set(c.id, c));
    return this;
  }

  reset() {
    this.campaigns.clear();
    this.creatives.clear();
    idSeq = 1;
    Object.keys(this.calls).forEach((k) => (this.calls[k] = []));
  }

  wasCalled(method: keyof typeof this.calls) {
    return this.calls[method].length > 0;
  }

  callCount(method: keyof typeof this.calls) {
    return this.calls[method].length;
  }
}