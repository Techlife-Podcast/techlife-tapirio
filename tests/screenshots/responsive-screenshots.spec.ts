import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { 
  DEFAULT_CONFIG, 
  generateTimestamp, 
  generateScreenshotPath, 
  generateFileName,
  BreakpointConfig 
} from './screenshot-config';

// Global timestamp for this test run - all screenshots in same run use same timestamp
const CURRENT_TIMESTAMP = generateTimestamp();
const SCREENSHOT_DIR = generateScreenshotPath(DEFAULT_CONFIG, CURRENT_TIMESTAMP);

async function ensureScreenshotDir() {
  try {
    await fs.access(SCREENSHOT_DIR);
  } catch {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  }
}

async function takeFullPageScreenshot(
  page: Page, 
  route: string, 
  breakpoint: BreakpointConfig
): Promise<string> {
  // Set viewport for current breakpoint
  await page.setViewportSize({
    width: breakpoint.width,
    height: breakpoint.height,
  });

  // Navigate to route
  await page.goto(route);

  // Wait for network to be idle to ensure all content is loaded
  if (DEFAULT_CONFIG.waitForNetworkIdle) {
    await page.waitForLoadState('networkidle');
  }
  
  // Additional wait for any dynamic content
  if (DEFAULT_CONFIG.additionalWaitTime > 0) {
    await page.waitForTimeout(DEFAULT_CONFIG.additionalWaitTime);
  }

  // Generate filename using device-first naming
  const fileName = generateFileName(route, breakpoint.name, DEFAULT_CONFIG.deviceFirstNaming);
  const filePath = path.join(SCREENSHOT_DIR, fileName);

  // Take full page screenshot
  await page.screenshot({
    path: filePath,
    fullPage: DEFAULT_CONFIG.fullPage,
    type: DEFAULT_CONFIG.screenshotType,
  });

  return fileName;
}

test.describe('Responsive Screenshots V2 (Timestamped)', () => {
  test.beforeAll(async () => {
    await ensureScreenshotDir();
    console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  });

  // Test each route across all breakpoints
  for (const route of DEFAULT_CONFIG.routes) {
    test.describe(`Route: ${route}`, () => {
      for (const breakpoint of DEFAULT_CONFIG.breakpoints) {
        test(`${route} at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
          const fileName = await takeFullPageScreenshot(page, route, breakpoint);
          
          // Verify screenshot was created
          const screenshotPath = path.join(SCREENSHOT_DIR, fileName);
          const stats = await fs.stat(screenshotPath);
          expect(stats.size).toBeGreaterThan(0);
          
          console.log(`✓ Screenshot saved: ${fileName}`);
        });
      }
    });
  }

  // Summary test that shows the final structure
  test('Generate run summary', async () => {
    const files = await fs.readdir(SCREENSHOT_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));
    
    console.log('\n📊 Screenshot Run Summary:');
    console.log(`Timestamp: ${CURRENT_TIMESTAMP}`);
    console.log(`Total screenshots: ${pngFiles.length}`);
    console.log(`Directory: ${SCREENSHOT_DIR}`);
    
    // Group by device for better overview
    const byDevice = DEFAULT_CONFIG.breakpoints.map(bp => ({
      device: bp.name,
      count: pngFiles.filter(file => file.startsWith(`${bp.name}-`)).length,
      files: pngFiles.filter(file => file.startsWith(`${bp.name}-`)).sort()
    }));
    
    byDevice.forEach(({ device, count, files }) => {
      console.log(`\n${device.toUpperCase()}: ${count} screenshots`);
      files.forEach(file => console.log(`  - ${file}`));
    });
    
    console.log(`\n📁 All screenshots saved to: ${SCREENSHOT_DIR}`);
  });
});