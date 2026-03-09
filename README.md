# Take-Home Exercise: Ad Campaign Test Automation

**Time allocation:** 2-3 hours  
**Submission deadline:** maximum 5 days from receipt  
**What to submit:** GitHub repository link (public or give us access)

---

## Overview

Welcome! You're looking to join the Snicket Labs engineering team. We're building a platform that helps publishers manage and deliver video technology. 

A new feature is in development that allows publishers to create, edit, and preview ad campaigns. The feature is being actively developed with frequent changes. Your task is to design and implement an automated testing approach for this feature.

---

## What We're Looking For

- **Pragmatic test design** - appropriate balance of test types and coverage
- **Clean, maintainable code** - we'll be working with this for years
- **Clear communication** - good documentation and code review feedback
- **Real-world thinking** - what would you actually do on a team?

**Important:** We're more interested in your thinking and approach than perfect implementation. If you run out of time, tell us what you would do next.

---

## Part 1: Test Strategy Document (30-45 minutes)

Create a document (Markdown, PDF, or text file) that outlines your testing approach for the ad campaign feature.

### Address These Questions:

1. **Test Types**: What types of testing would you implement (unit, integration, E2E, API, etc.) and why?

2. **CI/CD Integration**: How would you integrate these tests into a CI/CD pipeline? What runs when?

3. **Coverage vs. Speed**: How do you balance comprehensive testing with fast feedback?

### Format
- Concise (2-3 pages max)
- Use bullet points, diagrams, or whatever communicates clearly
- Focus on "why" not just "what"

---

## Part 2: Automated Test Implementation (1.5-2 hours)

Implement automated tests for the ad campaign feature using the provided API documentation and user stories below.

### Requirements

**Choose ONE of these approaches:**
- **Option A**: API tests only (if you prefer backend testing focus)
- **Option B**: UI tests only (if you prefer E2E testing focus)  
- **Option C**: Mix of both (shows breadth)

**Tech Stack - Your Choice**
- Language: Ruby, JavaScript/TypeScript (or your preference)
- Framework: Any you're comfortable with (Selenium, Playwright, Cypress, RSpec, Pytest, etc.)

### What to Implement

Pick **Pick 1-3 of the supplied user journeys** from the user stories below and implement automated tests. We recommend:
1. One "happy path" scenario
2. One error/validation scenario
3. One edge case or complex scenario (optional)
**REMEMBER: You are not expeceted to complete ALL the users stories just choose betwen 1 & 3 that you feel highlight your skills best**

### Code Structure

Your submission should include:
- Test files demonstrating your approach
- Page Object Model or similar abstraction pattern (if doing UI tests)
- API client wrapper (if doing API tests)
- Clear test organization and naming
- `README.md` with:
  - Setup instructions
  - How to run tests
  - What you implemented and why
  - What you'd do with more time

---

## API Documentation

### Base URL
```
https://app.ad-signal.io/
```

### Authentication
All requests require an API key in the header:
```
Authorization: Bearer YOUR_API_KEY
```

For tests, use: `test_api_key_12345`

---

### Endpoints

#### 1. Create Campaign

**POST** `/campaigns`

Creates a new ad campaign.

**Request Body:**
```json
{
  "name": "string (required, 3-100 chars)",
  "description": "string (optional, max 500 chars)",
  "start_date": "ISO8601 datetime (required)",
  "end_date": "ISO8601 datetime (required)",
  "budget": "number (required, min 0.01, max 1000000)",
  "currency": "string (required, 'GBP', 'USD', 'EUR')",
  "status": "string (optional, 'draft' | 'active' | 'paused', default: 'draft')",
  "target_audience": {
    "countries": ["array of ISO country codes"],
    "age_ranges": ["18-24", "25-34", "35-44", "45-54", "55+"],
    "interests": ["array of interest keywords"]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "camp_abc123",
  "name": "Summer Sale 2026",
  "description": "Q2 promotional campaign",
  "start_date": "2026-06-01T00:00:00Z",
  "end_date": "2026-08-31T23:59:59Z",
  "budget": 50000.00,
  "currency": "GBP",
  "spend": 0.00,
  "status": "draft",
  "target_audience": {
    "countries": ["GB", "IE"],
    "age_ranges": ["25-34", "35-44"],
    "interests": ["technology", "gadgets"]
  },
  "created_at": "2026-02-09T10:30:00Z",
  "updated_at": "2026-02-09T10:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid API key
- `422 Unprocessable Entity` - Business logic errors (e.g., end_date before start_date)

---

#### 2. Get Campaign

**GET** `/campaigns/:id`

Retrieves a specific campaign by ID.

**Response (200 OK):**
```json
{
  "id": "camp_abc123",
  "name": "Summer Sale 2026",
  "description": "Q2 promotional campaign",
  "start_date": "2026-06-01T00:00:00Z",
  "end_date": "2026-08-31T23:59:59Z",
  "budget": 50000.00,
  "currency": "GBP",
  "spend": 12345.67,
  "status": "active",
  "target_audience": {
    "countries": ["GB", "IE"],
    "age_ranges": ["25-34", "35-44"],
    "interests": ["technology", "gadgets"]
  },
  "created_at": "2026-02-09T10:30:00Z",
  "updated_at": "2026-02-09T11:45:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Campaign doesn't exist

---

#### 3. Update Campaign

**PATCH** `/campaigns/:id`

Updates an existing campaign. Only provided fields are updated.

**Request Body:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "end_date": "ISO8601 datetime (optional)",
  "budget": "number (optional)",
  "status": "string (optional)"
}
```

**Note:** Cannot update `start_date`, `currency`, or `spend` after creation.

**Response (200 OK):** Returns updated campaign object

**Error Responses:**
- `400 Bad Request` - Validation errors
- `404 Not Found` - Campaign doesn't exist
- `422 Unprocessable Entity` - Cannot modify active campaign's budget below current spend

---

#### 4. List Campaigns

**GET** `/campaigns`

Lists all campaigns with optional filtering.

**Query Parameters:**
- `status` - Filter by status (draft, active, paused, completed)
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 25, max: 100)
- `sort` - Sort field (created_at, start_date, budget)
- `order` - Sort order (asc, desc)

**Response (200 OK):**
```json
{
  "campaigns": [
    { /* campaign object */ },
    { /* campaign object */ }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 123,
    "per_page": 25
  }
}
```

---

#### 5. Delete Campaign

**DELETE** `/campaigns/:id`

Deletes a campaign. Can only delete campaigns in 'draft' status.

**Response (204 No Content)**

**Error Responses:**
- `404 Not Found` - Campaign doesn't exist
- `422 Unprocessable Entity` - Cannot delete active or completed campaigns

---

#### 6. Add Creative to Campaign

**POST** `/campaigns/:id/creatives`

Attaches an advertising creative (video) to a campaign.

**Request Body:**
```json
{
  "video_url": "string (required, must be HTTPS)",
  "duration_seconds": "number (required, min 5, max 120)",
  "format": "string (required, 'mp4' | 'webm')",
  "resolution": "string (required, '1920x1080' | '1280x720' | '640x360')",
  "title": "string (required)",
  "click_through_url": "string (optional, must be HTTPS)"
}
```

**Response (201 Created):**
```json
{
  "id": "cre_xyz789",
  "campaign_id": "camp_abc123",
  "video_url": "https://cdn.adsignal.test/videos/creative_123.mp4",
  "duration_seconds": 30,
  "format": "mp4",
  "resolution": "1920x1080",
  "title": "Summer Sale - Main Creative",
  "click_through_url": "https://example.com/sale",
  "status": "pending_review",
  "created_at": "2026-02-09T12:00:00Z"
}
```

---

#### 7. Get Campaign Analytics

**GET** `/campaigns/:id/analytics`

Returns performance analytics for a campaign.

**Query Parameters:**
- `start_date` - Start of date range (ISO8601)
- `end_date` - End of date range (ISO8601)
- `granularity` - Data granularity (hour, day, week)

**Response (200 OK):**
```json
{
  "campaign_id": "camp_abc123",
  "date_range": {
    "start": "2026-06-01T00:00:00Z",
    "end": "2026-06-07T23:59:59Z"
  },
  "summary": {
    "impressions": 125000,
    "clicks": 2500,
    "click_through_rate": 0.02,
    "spend": 1250.00,
    "cost_per_click": 0.50
  },
  "daily_breakdown": [
    {
      "date": "2026-06-01",
      "impressions": 15000,
      "clicks": 300,
      "spend": 150.00
    }
  ]
}
```

---

## User Stories

### Story 1: Create Basic Campaign
**As a** publisher  
**I want to** create a new ad campaign  
**So that** I can start serving ads to my audience

**Acceptance Criteria:**
- Campaign must have a name, start date, end date, and budget
- Start date must be in the future or today
- End date must be after start date
- Budget must be positive
- Campaign is created in 'draft' status by default
- System returns campaign ID upon successful creation

---

### Story 2: Update Campaign Budget
**As a** publisher  
**I want to** update my campaign budget  
**So that** I can adjust spend based on performance

**Acceptance Criteria:**
- Can increase budget at any time
- Can decrease budget if new amount is above current spend
- Cannot reduce budget below current spend
- Budget updates are logged in audit trail

---

### Story 3: Pause and Resume Campaign
**As a** publisher  
**I want to** pause and resume my campaign  
**So that** I can control when ads are served

**Acceptance Criteria:**
- Can pause active campaigns
- Can resume paused campaigns
- Cannot pause draft campaigns (must activate first)
- Paused campaigns don't accumulate spend
- Can only activate campaigns with at least one approved creative

---

### Story 4: Delete Draft Campaign
**As a** publisher  
**I want to** delete campaigns I no longer need  
**So that** my campaign list stays clean

**Acceptance Criteria:**
- Can delete campaigns in 'draft' status only
- Cannot delete active or completed campaigns
- Deletion is permanent (no soft delete)
- Returns appropriate error for invalid deletions

---

### Story 5: View Campaign Analytics
**As a** publisher  
**I want to** view my campaign performance  
**So that** I can measure ROI

**Acceptance Criteria:**
- Can view impressions, clicks, CTR, and spend
- Can filter by date range
- Can see daily breakdown
- Returns empty data for campaigns that haven't started
- Analytics update in near real-time (< 5 minutes)

---

### Story 6: Add Video Creative
**As a** publisher  
**I want to** attach video creatives to my campaign  
**So that** I can deliver advertising content

**Acceptance Criteria:**
- Video must be HTTPS URL
- Must support MP4 and WebM formats
- Duration must be between 5-120 seconds
- Creative goes to 'pending_review' status
- Campaign must exist before adding creatives
- One campaign can have multiple creatives

---

### Story 7: List Campaigns with Filters
**As a** publisher  
**I want to** view and filter my campaigns  
**So that** I can find specific campaigns quickly

**Acceptance Criteria:**
- Can filter by status (draft, active, paused, completed)
- Results are paginated (25 per page default)
- Can sort by date or budget
- Returns empty list if no matches

---

## Mock UI Wireframes

Since this is primarily an API testing exercise, UI wireframes are simplified. If you choose to implement UI tests (Option B or C), imagine a standard dashboard interface:

### Campaign List Page
```
+--------------------------------------------------+
| Snicket Labs Dashboard                    [+ New]   |
+--------------------------------------------------+
| Filter: [All] [Active] [Draft] [Paused]         |
|                                                   |
| Campaign Name        | Status  | Budget | Spend  |
|--------------------------------------------------+
| Summer Sale 2026     | Active  | £50k   | £12k   |
| Winter Promo         | Draft   | £30k   | £0     |
| Spring Launch        | Paused  | £25k   | £8k    |
+--------------------------------------------------+
```

### Create/Edit Campaign Form
```
+--------------------------------------------------+
| New Campaign                                      |
+--------------------------------------------------+
| Name: [_________________________________]         |
|                                                   |
| Description:                                      |
| [_____________________________________________]  |
|                                                   |
| Start Date: [_________] End Date: [_________]    |
|                                                   |
| Budget: [_________] Currency: [GBP ▼]           |
|                                                   |
| Status: ⚪ Draft ⚪ Active ⚪ Paused             |
|                                                   |
| [Cancel]                        [Save Campaign]   |
+--------------------------------------------------+
```

### Campaign Detail Page
```
+--------------------------------------------------+
| Summer Sale 2026                    [Edit] [⋮]   |
+--------------------------------------------------+
| Status: Active          Budget: £50,000          |
| Spend: £12,345.67       Remaining: £37,654.33    |
|                                                   |
| [Creatives] [Analytics] [Settings]               |
|                                                   |
| [Chart showing impressions/clicks over time]     |
|                                                   |
| Recent Activity:                                  |
| - 2,000 impressions in last hour                 |
| - 45 clicks (2.25% CTR)                          |
+--------------------------------------------------+
```

---

## Test Data Recommendations

Here are some suggested test data scenarios:

### Valid Campaigns
```ruby
{
  name: "Test Campaign 001",
  description: "Automated test campaign",
  start_date: (Date.today + 1).to_s,
  end_date: (Date.today + 30).to_s,
  budget: 1000.00,
  currency: "GBP",
  target_audience: {
    countries: ["GB"],
    age_ranges: ["25-34"],
    interests: ["technology"]
  }
}
```

### Edge Cases to Consider
- Campaign with minimum budget (£0.01)
- Campaign with maximum budget (£1,000,000)
- Campaign name with exactly 100 characters
- Start date equals end date (24-hour campaign)
- Campaign with all supported countries
- Campaign with empty description (optional field)

### Invalid Data to Test
- Empty campaign name
- Budget of zero or negative
- End date before start date
- Start date in the past
- Unsupported currency code
- Invalid country codes

---

## Submission Checklist

Before submitting, make sure you have:

- [ ] Test strategy document explaining your approach
- [ ] Automated tests for 2-3 user journeys
- [ ] README with setup and running instructions
- [ ] Code review feedback document
- [ ] Tests are runnable (we'll try to run them!)
- [ ] Code is well-organized and commented where needed
- [ ] Git history shows your thought process (don't squash everything!)

---

## FAQ

**Q: Can I use a different language/framework?**  
A: Yes! While we use Ruby and JavaScript, use what you're most comfortable with. Just make sure to document setup clearly.

**Q: Should I actually make HTTP requests?**  
A: Your choice! You can mock the API, use a tool like WireMock, or make real requests to a mock server. Tell us your approach in the README.

**Q: I'm running out of time. What should I prioritize?**  
A: Test strategy document and one well-implemented test are better than three rushed ones. Tell us what you'd do with more time.

**Q: Can I use AI tools like Copilot?**  
A: Yes, we use them too! Just make sure you understand and can explain all the code.

**Q: What if I get stuck?**  
A: Document where you got stuck and how you'd solve it with more time or help. We're evaluating problem-solving, not perfection.

**Q: Should tests actually pass?**  
A: Yes, ideally! But if you're testing against mocked APIs, just show us the structure and explain what they'd verify.

---

## What Happens Next

After you submit:
1. We'll review within 3-5 working days
2. If successful, we'll invite you to a technical interview where we'll:
   - Discuss your approach and decisions
   - Pair program on a related problem
   - Answer your questions about the role

Good luck! We're excited to see your approach.

---

*Questions? Email laurence.wilks@snicketlabs.io*
