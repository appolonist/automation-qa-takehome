import { APIRequestContext } from "@playwright/test";
import type {
  ApiResponse, Campaign, CreateCampaignPayload, UpdateCampaignPayload,
  ListCampaignsParams, PaginatedCampaigns, Creative, AddCreativePayload,
  CampaignAnalytics, AnalyticsParams,
} from "./types";

export class CampaignApiClient {
  constructor(
    private request: APIRequestContext,
    private baseUrl: string
  ) {}

  private endpoint(path = "") {
    return `${this.baseUrl}/campaigns${path}`;
  }

  private async wrap<T>(fn: () => Promise<any>): Promise<ApiResponse<T>> {
    const res = await fn();
    const data = res.status() === 204 ? undefined : await res.json().catch(() => undefined);
    return { data, status: res.status(), ok: res.ok() };
  }

  create(payload: CreateCampaignPayload): Promise<ApiResponse<Campaign>> {
    return this.wrap(() => this.request.post(this.endpoint(), { data: payload }));
  }

  getById(id: string): Promise<ApiResponse<Campaign>> {
    return this.wrap(() => this.request.get(this.endpoint(`/${id}`)));
  }

  update(id: string, payload: UpdateCampaignPayload): Promise<ApiResponse<Campaign>> {
    return this.wrap(() => this.request.patch(this.endpoint(`/${id}`), { data: payload }));
  }

  list(params?: ListCampaignsParams): Promise<ApiResponse<PaginatedCampaigns>> {
    return this.wrap(() => this.request.get(this.endpoint(), { params: params as Record<string, any> }));
  }

  delete(id: string): Promise<ApiResponse<void>> {
    return this.wrap(() => this.request.delete(this.endpoint(`/${id}`)));
  }

  addCreative(campaignId: string, payload: AddCreativePayload): Promise<ApiResponse<Creative>> {
    return this.wrap(() =>
      this.request.post(this.endpoint(`/${campaignId}/creatives`), { data: payload })
    );
  }

  getAnalytics(campaignId: string, params?: AnalyticsParams): Promise<ApiResponse<CampaignAnalytics>> {
    return this.wrap(() =>
      this.request.get(this.endpoint(`/${campaignId}/analytics`), { params: params as Record<string, any> })
    );
  }
}