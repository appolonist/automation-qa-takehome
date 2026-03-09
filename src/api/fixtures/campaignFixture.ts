import { test as base } from "@playwright/test";
import { MockCampaignApiClient } from "../mockCampaignApiClient";
import { CampaignApiClient } from "../campaignApiClient";

type Fixtures = {
  mockCampaignApi: MockCampaignApiClient;
  realCampaignApi: CampaignApiClient;
};

export const test = base.extend<Fixtures>({
  mockCampaignApi: async ({}, use) => {
    const client = new MockCampaignApiClient();
    await use(client);
    client.reset();
  },
  realCampaignApi: async ({ request }, use) => {
    await use(new CampaignApiClient(request, process.env.BASE_URL ?? "http://localhost:3000"));
  },
});

export { expect } from "@playwright/test";