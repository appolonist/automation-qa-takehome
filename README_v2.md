# Installation and Setup

- (Optional) Install VSCode recommended plugin: `ms-playwright.playwright`
- Install dependencies: `npm install`
- Setup Playwright with: `npx playwright install --with-deps chromium`
- Create `.env` file and add: `BASE_URL='https://app.ad-signal.io' API_KEY='test_api_key_12345'`

## Usage

### Available Test Scripts

| Script                | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `npm test`            | Run all tests                                |
| `npm run test:story1` | Run the create campaign tests                |
| `npm run test:story2` | Run the update budget tests                  |
| `npm run test:story4` | Run the delete campaign tests                |
| `npm run test:debug`  | Run tests in debug mode                      |
| `npm run test:headed` | Run tests in headed mode (visible browser)   |
| `npm run test:report` | View the HTML test report                    |
| `npm run test:ui`     | Run tests in UI mode (interactive test mode) |

## Solution

- The original test strategy file `testStrategy_original.txt` has been refactored by AI and the final result can be found in `testStrategy_AI_refactored.md`

- I have chosen option A and covered STORY 1, STORY 2, and STORY 4 with all acceptance criteria using expected test case types (successful, negative, and edge case)

- I have implemented a sample `mockCampaignApiClient` (I found a few issues related to it during test implementation, so additional issues may occur when implementing next STORIES)

- I have added support for a real API client

- I have organized tests per acceptance criteria and structured the code using the AAA approach

- I have added tags to tests to help filter information in the report and execute only the tests needed at the moment

- I have added scripts to `package.json` (described above)

## Next Steps

- Refactor tests and move test data to separate file(s)
- Add Authorization support for mockCampaignApiClient
- Split `types.ts` file into multiple files and implement necessary models and factories
- Move to UI tests implementation
