#!/usr/bin/env node
// scripts/check-and-analyze.mjs
// Wrapper script that only runs podcast analysis if there are new episodes

import { readFileSync, existsSync } from 'fs';
import { parseStringPromise } from 'xml2js';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const FEED_PATH = join(rootDir, 'public/podcast-feed.xml');
const ANALYSIS_PATH = join(rootDir, 'data/podcast-analysis-data.json');

async function getEpisodeCount(feedPath) {
  const feedContent = readFileSync(feedPath, 'utf-8');
  const result = await parseStringPromise(feedContent);
  return result.rss.channel[0].item.length;
}

function getAnalyzedCount() {
  if (!existsSync(ANALYSIS_PATH)) {
    return 0;
  }
  try {
    const analysis = JSON.parse(readFileSync(ANALYSIS_PATH, 'utf-8'));
    return analysis.episodeAnalyses?.length || 0;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('🔍 Checking for new episodes...');
  
  if (!existsSync(FEED_PATH)) {
    console.log('❌ Feed file not found, skipping analysis');
    process.exit(0);
  }

  const totalEpisodes = await getEpisodeCount(FEED_PATH);
  const analyzedEpisodes = getAnalyzedCount();
  const newEpisodes = totalEpisodes - analyzedEpisodes;

  console.log(`📊 Total episodes: ${totalEpisodes}`);
  console.log(`✅ Already analyzed: ${analyzedEpisodes}`);
  
  if (newEpisodes <= 0) {
    console.log('✨ No new episodes to analyze, skipping');
    process.exit(0);
  }

  console.log(`🆕 New episodes to analyze: ${newEpisodes}`);
  console.log('🚀 Running podcast analyzer...\n');
  
  try {
    // Run analyzer for the new episodes (last N)
    execSync(`npm run analyze-podcast analyze public/podcast-feed.xml "last ${newEpisodes}"`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('⚠️ Analysis failed, but continuing with build...');
    // Don't fail the build if analysis fails
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  // Don't fail the build
  process.exit(0);
});
