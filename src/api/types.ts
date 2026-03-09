export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type Currency = "GBP" | "USD" | "EUR";
export type AgeRange = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export type VideoFormat = "mp4" | "webm";
export type Resolution = "1920x1080" | "1280x720" | "640x360";
export type Granularity = "hour" | "day" | "week";
export type SortField = "created_at" | "start_date" | "budget";

export interface TargetAudience {
  countries?: string[];
  age_ranges?: AgeRange[];
  interests?: string[];
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: Currency;
  spend: number;
  status: CampaignStatus;
  target_audience: TargetAudience;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: Currency;
  status?: CampaignStatus;
  target_audience?: TargetAudience;
}

export interface UpdateCampaignPayload {
  name?: string;
  description?: string;
  end_date?: string;
  budget?: number;
  status?: CampaignStatus;
}

export interface ListCampaignsParams {
  status?: CampaignStatus;
  page?: number;
  per_page?: number;
  sort?: SortField;
  order?: "asc" | "desc";
}

export interface PaginatedCampaigns {
  campaigns: Campaign[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface Creative {
  id: string;
  campaign_id: string;
  video_url: string;
  duration_seconds: number;
  format: VideoFormat;
  resolution: Resolution;
  title: string;
  click_through_url?: string;
  status: "pending_review" | "approved" | "rejected";
  created_at: string;
}

export interface AddCreativePayload {
  video_url: string;
  duration_seconds: number;
  format: VideoFormat;
  resolution: Resolution;
  title: string;
  click_through_url?: string;
}

export interface AnalyticsParams {
  start_date?: string;
  end_date?: string;
  granularity?: Granularity;
}

export interface CampaignAnalytics {
  campaign_id: string;
  date_range: { start: string; end: string };
  summary: {
    impressions: number;
    clicks: number;
    click_through_rate: number;
    spend: number;
    cost_per_click: number;
  };
  daily_breakdown: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}