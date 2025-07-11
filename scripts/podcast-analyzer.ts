// scripts/podcast-analyzer.ts

import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import OpenAI from 'openai';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

interface Episode {
  title: string;
  episodeNumber: number;
  description: string;
  subtitle?: string;
  pubDate: string;
  guid: string;
}

interface EpisodeAnalysis {
  episodeNumber: number;
  title: string;
  tags: string[];
  summary: string;
}

interface AnalysisProgress {
  lastProcessedEpisode: number;
  totalEpisodes: number;
  processedAt: string;
  commonCategories: string[];
  episodeAnalyses: EpisodeAnalysis[];
}

class PodcastAnalyzer {
  private openai: OpenAI;
  private commonCategories: string[] = [];
  private maxCategories = 7;
  private maxTagsPerEpisode = 3;
  private progressFile = path.join(__dirname, '../data/podcast-analysis-progress.json');

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.progressFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private async parsePodcastFeed(feedPath: string): Promise<Episode[]> {
    const feedContent = fs.readFileSync(feedPath, 'utf-8');
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(feedContent);

    const episodes: Episode[] = result.rss.channel[0].item.map((item: any, index: number) => {
      // Extract episode number from title (assuming format "#123: Title")
      const titleMatch = item.title[0].match(/#(\d+):/);
      const episodeNumber = titleMatch ? parseInt(titleMatch[1]) : index + 1;

      // Clean description by removing HTML tags
      const rawDescription = item.description?.[0] || item['content:encoded']?.[0] || '';
      const description = this.stripHtml(rawDescription);

      return {
        title: item.title[0],
        episodeNumber,
        description,
        subtitle: item['itunes:subtitle']?.[0],
        pubDate: item.pubDate[0],
        guid: item.guid[0]
      };
    });

    // Sort by episode number for consistent processing
    return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private async extractCommonCategories(episodes: Episode[]): Promise<string[]> {
    const allDescriptions = episodes.map(ep => ep.description).join('\n\n');
    
    const prompt = `Analyze the following podcast episode descriptions from a Russian technology podcast called "Технологии и жизнь" (Technology and Life). 

Extract exactly 7 common categories that best represent the main topics discussed across all episodes. Categories should be:
- In Russian
- Broad enough to cover multiple episodes
- Technology and life focused
- Representative of the podcast's main themes

Episode descriptions:
${allDescriptions.substring(0, 15000)} // Truncate if too long

Return ONLY a JSON array of exactly 7 category names in Russian, for example:
["Искусственный интеллект", "Программирование", "Путешествия", "Философия технологий", "Социальные сети", "Виртуальная реальность", "Цифровая приватность"]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      const categories = JSON.parse(content);
      if (!Array.isArray(categories) || categories.length !== 7) {
        throw new Error('Invalid categories format');
      }

      return categories;
    } catch (error) {
      console.error('Error extracting categories:', error);
      // Fallback categories
      return [
        "Искусственный интеллект",
        "Программирование", 
        "Путешествия",
        "Философия технологий",
        "Цифровая приватность",
        "Виртуальная реальность",
        "Социальные технологии"
      ];
    }
  }

  private async analyzeEpisode(episode: Episode, categories: string[]): Promise<EpisodeAnalysis> {
    const prompt = `Analyze this Russian podcast episode and assign up to 3 relevant tags from the provided categories.

Episode Title: ${episode.title}
Episode Description: ${episode.description.substring(0, 2000)}

Available Categories: ${categories.join(', ')}

Instructions:
- Choose 1-3 most relevant categories that match this episode's content
- Provide a brief 1-sentence summary in Russian
- Return as JSON format

Example response:
{
  "tags": ["Искусственный интеллект", "Программирование"],
  "summary": "Обсуждение развития ИИ и его влияния на программирование."
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No response from OpenAI');

      const analysis = JSON.parse(content);
      
      return {
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        tags: analysis.tags.slice(0, this.maxTagsPerEpisode), // Ensure max 3 tags
        summary: analysis.summary
      };
    } catch (error) {
      console.error(`Error analyzing episode ${episode.episodeNumber}:`, error);
      return {
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        tags: [categories[0]], // Fallback to first category
        summary: "Анализ эпизода недоступен."
      };
    }
  }

  private loadProgress(): AnalysisProgress | null {
    try {
      if (fs.existsSync(this.progressFile)) {
        const content = fs.readFileSync(this.progressFile, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Could not load progress file:', error);
    }
    return null;
  }

  private saveProgress(progress: AnalysisProgress): void {
    try {
      fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
      console.log(`✅ Progress saved: ${progress.lastProcessedEpisode}/${progress.totalEpisodes} episodes processed`);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  public async analyzePodcast(feedPath: string): Promise<AnalysisProgress> {
    console.log('🎧 Starting podcast analysis...');
    
    // Parse episodes
    const episodes = await this.parsePodcastFeed(feedPath);
    console.log(`📊 Found ${episodes.length} episodes`);

    // Load existing progress
    let progress = this.loadProgress();
    let startFromEpisode = 0;

    if (progress) {
      console.log(`📋 Resuming from episode ${progress.lastProcessedEpisode + 1}`);
      startFromEpisode = progress.lastProcessedEpisode;
      this.commonCategories = progress.commonCategories;
    }

    // Extract categories if not already done
    if (this.commonCategories.length === 0) {
      console.log('🏷️  Extracting common categories...');
      this.commonCategories = await this.extractCommonCategories(episodes);
      console.log('📂 Categories:', this.commonCategories);
    }

    // Initialize or update progress
    if (!progress) {
      progress = {
        lastProcessedEpisode: 0,
        totalEpisodes: episodes.length,
        processedAt: new Date().toISOString(),
        commonCategories: this.commonCategories,
        episodeAnalyses: []
      };
    } else {
      progress.commonCategories = this.commonCategories;
      progress.totalEpisodes = episodes.length;
    }

    // Process episodes
    const episodesToProcess = episodes.slice(startFromEpisode);
    
    for (let i = 0; i < episodesToProcess.length; i++) {
      const episode = episodesToProcess[i];
      console.log(`📝 Analyzing episode ${episode.episodeNumber}: ${episode.title.substring(0, 50)}...`);
      
      const analysis = await this.analyzeEpisode(episode, this.commonCategories);
      
      // Update or add analysis
      const existingIndex = progress.episodeAnalyses.findIndex(
        a => a.episodeNumber === analysis.episodeNumber
      );
      
      if (existingIndex >= 0) {
        progress.episodeAnalyses[existingIndex] = analysis;
      } else {
        progress.episodeAnalyses.push(analysis);
      }

      progress.lastProcessedEpisode = episode.episodeNumber;
      progress.processedAt = new Date().toISOString();

      // Save progress every 5 episodes
      if ((i + 1) % 5 === 0) {
        this.saveProgress(progress);
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final save
    this.saveProgress(progress);

    console.log('🎉 Analysis complete!');
    console.log(`📈 Processed ${progress.episodeAnalyses.length} episodes`);
    console.log(`🏷️  Categories: ${this.commonCategories.join(', ')}`);

    return progress;
  }

  public getProgressSummary(): void {
    const progress = this.loadProgress();
    if (!progress) {
      console.log('No analysis progress found.');
      return;
    }

    console.log('\n📊 Podcast Analysis Summary');
    console.log('=' .repeat(50));
    console.log(`Total Episodes: ${progress.totalEpisodes}`);
    console.log(`Processed Episodes: ${progress.episodeAnalyses.length}`);
    console.log(`Last Processed: Episode ${progress.lastProcessedEpisode}`);
    console.log(`Last Updated: ${new Date(progress.processedAt).toLocaleString()}`);
    console.log(`\n🏷️  Categories (${progress.commonCategories.length}):`);
    progress.commonCategories.forEach((cat, i) => console.log(`  ${i + 1}. ${cat}`));

    // Show tag distribution
    const tagCounts: Record<string, number> = {};
    progress.episodeAnalyses.forEach(ep => {
      ep.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    console.log(`\n📈 Tag Usage:`);
    Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([tag, count]) => console.log(`  ${tag}: ${count} episodes`));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  const analyzer = new PodcastAnalyzer(process.env.OPENAI_API_KEY);

  switch (command) {
    case 'analyze':
      const feedPath = args[1] || 'public/podcast-feed.xml';
      await analyzer.analyzePodcast(feedPath);
      break;
    
    case 'status':
      analyzer.getProgressSummary();
      break;
    
    default:
      console.log(`
🎧 Podcast Analyzer

Usage:
  npm run analyze-podcast analyze [feed-path]  - Analyze podcast feed
  npm run analyze-podcast status              - Show analysis progress

Environment:
  OPENAI_API_KEY - Required OpenAI API key

Examples:
  npm run analyze-podcast analyze
  npm run analyze-podcast analyze public/podcast-feed.xml
  npm run analyze-podcast status
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PodcastAnalyzer, type AnalysisProgress, type EpisodeAnalysis }; 