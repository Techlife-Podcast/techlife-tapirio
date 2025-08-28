import fs from 'fs/promises';
import path from 'path';

interface ScreenshotInfo {
  filename: string;
  route: string;
  breakpoint: string;
  size: number;
  timestamp: string;
}

interface TimestampedRun {
  timestamp: string;
  path: string;
  screenshots: ScreenshotInfo[];
  screenshotCount: number;
}

interface AnalysisReport {
  totalRuns: number;
  latestRun: TimestampedRun | null;
  allRuns: TimestampedRun[];
  routesCovered: string[];
  breakpointsCovered: string[];
  potentialIssues: string[];
}

export class TimestampedScreenshotAnalyzer {
  private baseDir: string;

  constructor(baseDir: string = 'test-results/screenshots') {
    this.baseDir = path.resolve(baseDir);
  }

  async analyzeAllRuns(): Promise<AnalysisReport> {
    try {
      const timestampDirs = await this.getTimestampDirectories();
      const allRuns: TimestampedRun[] = [];

      for (const timestamp of timestampDirs) {
        const runPath = path.join(this.baseDir, timestamp);
        const screenshots = await this.parseScreenshotsInDir(runPath, timestamp);
        
        allRuns.push({
          timestamp,
          path: runPath,
          screenshots,
          screenshotCount: screenshots.length,
        });
      }

      // Sort by timestamp (newest first)
      allRuns.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return this.generateTimestampedReport(allRuns);
    } catch (error) {
      throw new Error(`Failed to analyze timestamped screenshots: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeLatestRun(): Promise<AnalysisReport> {
    const allRuns = await this.analyzeAllRuns();
    
    if (allRuns.latestRun) {
      return {
        ...allRuns,
        allRuns: [allRuns.latestRun], // Only include latest run
      };
    }
    
    return allRuns;
  }

  private async getTimestampDirectories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}(-\d{2})?$/.test(name)) // Match timestamp format (with or without seconds)
        .sort();
    } catch (error) {
      return [];
    }
  }

  private async parseScreenshotsInDir(dirPath: string, timestamp: string): Promise<ScreenshotInfo[]> {
    const screenshots: ScreenshotInfo[] = [];

    try {
      const files = await fs.readdir(dirPath);
      
      for (const filename of files) {
        if (!filename.endsWith('.png') && !filename.endsWith('.jpg')) {
          continue;
        }

        const filePath = path.join(dirPath, filename);
        const stats = await fs.stat(filePath);
        
        // Parse device-first filename: {breakpoint}-{route}.png
        const parsed = this.parseDeviceFirstFilename(filename);
        
        screenshots.push({
          filename,
          route: parsed.route,
          breakpoint: parsed.breakpoint,
          size: stats.size,
          timestamp,
        });
      }
    } catch (error) {
      // Directory might not exist or be empty
    }

    return screenshots;
  }

  private parseDeviceFirstFilename(filename: string): { route: string; breakpoint: string } {
    const nameWithoutExt = filename.replace(/\.(png|jpg)$/, '');
    const firstDashIndex = nameWithoutExt.indexOf('-');
    
    if (firstDashIndex === -1) {
      return { breakpoint: nameWithoutExt, route: 'unknown' };
    }

    return {
      breakpoint: nameWithoutExt.substring(0, firstDashIndex),
      route: nameWithoutExt.substring(firstDashIndex + 1),
    };
  }

  private generateTimestampedReport(allRuns: TimestampedRun[]): AnalysisReport {
    const latestRun = allRuns.length > 0 ? allRuns[0] : null;
    const allScreenshots = allRuns.flatMap(run => run.screenshots);
    
    const routes = [...new Set(allScreenshots.map(s => s.route))];
    const breakpoints = [...new Set(allScreenshots.map(s => s.breakpoint))];
    
    const potentialIssues = this.identifyPotentialIssues(allRuns, allScreenshots);

    return {
      totalRuns: allRuns.length,
      latestRun,
      allRuns,
      routesCovered: routes,
      breakpointsCovered: breakpoints,
      potentialIssues,
    };
  }

  private identifyPotentialIssues(runs: TimestampedRun[], screenshots: ScreenshotInfo[]): string[] {
    const issues: string[] = [];

    if (runs.length === 0) {
      issues.push('No screenshot runs found - run "npm run screenshots" first');
      return issues;
    }

    const latestRun = runs[0];
    
    // Check for missing breakpoints in latest run
    const expectedBreakpoints = ['mobile', 'tablet', 'desktop', 'wide'];
    const latestBreakpoints = new Set(latestRun.screenshots.map(s => s.breakpoint));
    
    for (const expected of expectedBreakpoints) {
      if (!latestBreakpoints.has(expected)) {
        issues.push(`Latest run missing ${expected} screenshots`);
      }
    }

    // Check for unusually large files in latest run
    if (latestRun.screenshots.length > 0) {
      const avgSize = latestRun.screenshots.reduce((sum, s) => sum + s.size, 0) / latestRun.screenshots.length;
      const largeFiles = latestRun.screenshots.filter(s => s.size > avgSize * 2);
      
      for (const file of largeFiles.slice(0, 5)) { // Limit to 5 issues
        issues.push(`Large screenshot in ${latestRun.timestamp}: ${file.filename} (${Math.round(file.size / 1024)}KB) - possible layout overflow`);
      }
    }

    // Check for runs with significantly different screenshot counts
    if (runs.length > 1) {
      const counts = runs.map(r => r.screenshotCount);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      
      if (maxCount - minCount > 5) {
        issues.push(`Inconsistent screenshot counts across runs: ${minCount}-${maxCount} screenshots`);
      }
    }

    return issues;
  }

  async generateHtmlReport(mode: 'latest' | 'all' = 'latest'): Promise<string> {
    const report = mode === 'latest' ? await this.analyzeLatestRun() : await this.analyzeAllRuns();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timestamped Screenshot Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 2rem; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; background: #f9f9f9; }
        .card h3 { margin-top: 0; color: #333; }
        .issues { background-color: #fff3cd; border-color: #ffeaa7; }
        .run { border: 1px solid #ddd; margin-bottom: 1rem; border-radius: 8px; overflow: hidden; }
        .run-header { background: #333; color: white; padding: 1rem; }
        .run-content { padding: 1rem; }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0; }
        .screenshot { border: 1px solid #ddd; padding: 0.5rem; text-align: center; border-radius: 4px; background: white; }
        .screenshot img { max-width: 100%; height: auto; border-radius: 4px; }
        .filename { font-size: 0.8rem; color: #666; margin-top: 0.5rem; word-break: break-all; }
        .device-group { margin-bottom: 1rem; }
        .device-title { font-weight: bold; color: #555; margin-bottom: 0.5rem; }
        .latest { border-color: #28a745; }
        .latest .run-header { background: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 Timestamped Screenshot Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleString()} | Mode: ${mode}</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>📊 Overview</h3>
            <p><strong>Total Runs:</strong> ${report.totalRuns}</p>
            ${report.latestRun ? `<p><strong>Latest Run:</strong> ${report.latestRun.timestamp}</p>` : ''}
            ${report.latestRun ? `<p><strong>Screenshots in Latest:</strong> ${report.latestRun.screenshotCount}</p>` : ''}
        </div>

        <div class="card">
            <h3>🎯 Coverage</h3>
            <p><strong>Routes:</strong> ${report.routesCovered.join(', ')}</p>
            <p><strong>Breakpoints:</strong> ${report.breakpointsCovered.join(', ')}</p>
        </div>

        ${report.potentialIssues.length > 0 ? `
        <div class="card issues">
            <h3>⚠️ Potential Issues</h3>
            <ul>
                ${report.potentialIssues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>

    <h2>📸 Screenshot Runs</h2>
    ${report.allRuns.map((run, index) => `
        <div class="run ${index === 0 ? 'latest' : ''}">
            <div class="run-header">
                <h3>${run.timestamp} ${index === 0 ? '(Latest)' : ''}</h3>
                <p>${run.screenshotCount} screenshots</p>
            </div>
            <div class="run-content">
                ${this.generateDeviceGroupsHtml(run.screenshots, run.timestamp)}
            </div>
        </div>
    `).join('')}

    <h2>📱 Analysis Tips</h2>
    <div class="card">
        <h3>🔍 What to Look For</h3>
        <ul>
            <li><strong>Device-First Organization:</strong> Screenshots are now grouped by device for easier comparison</li>
            <li><strong>Layout Consistency:</strong> Compare the same route across different devices</li>
            <li><strong>Timeline Analysis:</strong> Track changes over multiple runs</li>
            <li><strong>File Size Trends:</strong> Monitor for increasing file sizes indicating layout issues</li>
            <li><strong>Missing Screenshots:</strong> Ensure all expected device/route combinations are captured</li>
        </ul>
    </div>
</body>
</html>
`;
  }

  private generateDeviceGroupsHtml(screenshots: ScreenshotInfo[], timestamp: string): string {
    const deviceGroups = screenshots.reduce((groups, screenshot) => {
      if (!groups[screenshot.breakpoint]) {
        groups[screenshot.breakpoint] = [];
      }
      groups[screenshot.breakpoint].push(screenshot);
      return groups;
    }, {} as Record<string, ScreenshotInfo[]>);

    return Object.entries(deviceGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([device, deviceScreenshots]) => `
        <div class="device-group">
          <div class="device-title">${device.toUpperCase()} (${deviceScreenshots.length} screenshots)</div>
          <div class="screenshot-grid">
            ${deviceScreenshots
              .sort((a, b) => a.route.localeCompare(b.route))
              .map(s => `
                <div class="screenshot">
                  <img src="${timestamp}/${s.filename}" alt="${s.filename}" loading="lazy">
                  <div class="filename">${s.filename}<br>(${Math.round(s.size / 1024)}KB)</div>
                </div>
              `).join('')}
          </div>
        </div>
      `).join('');
  }

  async saveHtmlReport(outputPath?: string, mode: 'latest' | 'all' = 'latest'): Promise<string> {
    const html = await this.generateHtmlReport(mode);
    const filepath = outputPath || path.join(this.baseDir, `analysis-report-${mode}.html`);
    
    // Ensure the directory exists before writing the file
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await fs.writeFile(filepath, html);
    return filepath;
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new TimestampedScreenshotAnalyzer();
  const mode = process.argv[2] as 'latest' | 'all' || 'latest';
  
  analyzer.analyzeAllRuns()
    .then(report => {
      console.log('\n📊 Timestamped Screenshot Analysis');
      console.log('=====================================');
      console.log(`Total Runs: ${report.totalRuns}`);
      
      if (report.latestRun) {
        console.log(`Latest Run: ${report.latestRun.timestamp} (${report.latestRun.screenshotCount} screenshots)`);
        console.log(`Routes: ${report.routesCovered.join(', ')}`);
        console.log(`Devices: ${report.breakpointsCovered.join(', ')}`);
      } else {
        console.log('No screenshot runs found.');
        console.log('\nTo create screenshots, run:');
        console.log('  npm run screenshots');
      }
      
      if (report.potentialIssues.length > 0) {
        console.log('\n⚠️ Potential Issues:');
        report.potentialIssues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      if (report.totalRuns > 0) {
        console.log('\n📁 Available runs:');
        report.allRuns.forEach((run, i) => {
          console.log(`  ${i === 0 ? '→' : ' '} ${run.timestamp} (${run.screenshotCount} screenshots)`);
        });
      }
      
      return analyzer.saveHtmlReport(undefined, mode);
    })
    .then(htmlPath => {
      console.log(`\n📄 HTML Report saved: ${htmlPath}`);
    })
    .catch(console.error);
}