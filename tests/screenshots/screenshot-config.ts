// Screenshot testing configuration
export interface BreakpointConfig {
  name: string;
  width: number;
  height: number;
  description?: string;
}

export interface ScreenshotConfig {
  breakpoints: BreakpointConfig[];
  routes: string[];
  outputDir: string;
  waitForNetworkIdle: boolean;
  additionalWaitTime: number;
  fullPage: boolean;
  screenshotType: 'png' | 'jpeg';
  useTimestampedFolders: boolean;
  deviceFirstNaming: boolean;
}

export const DEFAULT_CONFIG: ScreenshotConfig = {
  breakpoints: [
    { 
      name: 'mobile', 
      width: 375, 
      height: 812,
      description: 'iPhone X/11/12 size' 
    },
    { 
      name: 'tablet', 
      width: 768, 
      height: 1024,
      description: 'iPad portrait' 
    },
    { 
      name: 'desktop', 
      width: 1440, 
      height: 900,
      description: 'Standard desktop' 
    },
    { 
      name: 'wide', 
      width: 1920, 
      height: 1080,
      description: 'Full HD display' 
    },
  ],
  routes: [
    '/',
    '/about',
    '/resources',
    '/guests', 
    '/tags',
  ],
  outputDir: 'test-results/screenshots',
  waitForNetworkIdle: true,
  additionalWaitTime: 1000,
  fullPage: true,
  screenshotType: 'png',
  useTimestampedFolders: true,
  deviceFirstNaming: true,
};

// Custom configurations for different scenarios
export const MOBILE_FOCUSED_CONFIG: ScreenshotConfig = {
  ...DEFAULT_CONFIG,
  breakpoints: [
    { name: 'mobile-small', width: 320, height: 568, description: 'iPhone SE' },
    { name: 'mobile-standard', width: 375, height: 812, description: 'iPhone X/11/12' },
    { name: 'mobile-large', width: 414, height: 896, description: 'iPhone Pro Max' },
  ],
};

export const DESKTOP_FOCUSED_CONFIG: ScreenshotConfig = {
  ...DEFAULT_CONFIG,
  breakpoints: [
    { name: 'desktop-small', width: 1366, height: 768, description: 'Small laptop' },
    { name: 'desktop-standard', width: 1440, height: 900, description: 'Standard desktop' },
    { name: 'desktop-large', width: 1920, height: 1080, description: 'Full HD' },
    { name: 'desktop-ultra', width: 2560, height: 1440, description: '1440p display' },
  ],
};

// Route groups for focused testing
export const ROUTE_GROUPS = {
  core: ['/', '/about', '/resources'],
  content: ['/blog', '/tags', '/guests'],
  legacy: ['/home-2021'],
  dynamic: ['/episodes/167', '/episodes/166', '/tags/ai'],
};

export function createCustomConfig(overrides: Partial<ScreenshotConfig>): ScreenshotConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

// Utility functions for screenshot management
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export function generateScreenshotPath(config: ScreenshotConfig, timestamp?: string): string {
  if (config.useTimestampedFolders) {
    const ts = timestamp || generateTimestamp();
    return `${config.outputDir}/${ts}`;
  }
  return config.outputDir;
}

export function generateFileName(route: string, breakpoint: string, deviceFirst: boolean = true): string {
  const routeName = route === '/' ? 'home' : route.slice(1).replace(/\//g, '-');
  
  if (deviceFirst) {
    return `${breakpoint}-${routeName}.png`;
  } else {
    return `${routeName}-${breakpoint}.png`;
  }
}