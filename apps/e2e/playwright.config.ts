import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local at workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

/**
 * Playwright Configuration for E2E Testing
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './src',
  testMatch: /.*\.spec\.ts/,

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: '../../coverage/playwright-report' }],
    ['json', { outputFile: '../../coverage/playwright-results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.WEB_URL || 'http://localhost:4200',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // API endpoint for API testing
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'api',
      testDir: './src/tests/API',
      use: {
        baseURL: (process.env.API_URL || 'http://localhost:3000') + '/api/',
      },
    },
    {
      name: 'chromium',
      testDir: './src/playwright/tests',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4200' },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet viewports
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Run local dev servers before starting tests
  webServer: [
    {
      command: 'npm run api:dev',
      url: 'http://localhost:3000/api',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: path.resolve(__dirname, '../..'),
    },
    {
      command: 'npm run web:dev',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: path.resolve(__dirname, '../..'),
    },
  ],
});
