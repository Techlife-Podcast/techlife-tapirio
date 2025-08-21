// scripts/utils/podcast-analyzer/podcast-analyzer.ts

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

interface EpisodeRange {
  start: number;
  end: number;
}

interface LLMConfig {
  model: {
    name: string;
    temperature: number;
    maxTokens: {
      categoryExtraction: number;
      episodeAnalysis: number;
    };
  };
  analysis: {
    maxCategories: number;
    maxTagsPerEpisode: number;
    rateLimitDelayMs: number;
    progressSaveInterval: number;
    retrySettings: {
      maxRetries: number;
      baseDelayMs: number;
    };
    presetCategories: string[];
  };
  prompts: {
    categoryExtraction: {
      systemMessage: string;
      temperature: number;
    };
    episodeAnalysis: {
      systemMessage: string;
      temperature: number;
    };
  };
}

class PodcastAnalyzer {
  private openai: OpenAI;
  private commonCategories: string[] = [];
  private config: LLMConfig;
  private progressFile = path.join(__dirname, '../../../data/podcast-analysis-progress.json');
  private temperatureWarningShown = false;

  constructor(apiKey: string, configPath?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Load configuration
    this.config = this.loadConfig(configPath);
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.progressFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private getTokensParameter(maxTokens: number): { max_tokens?: number; max_completion_tokens?: number } {
    // GPT-5 and newer models use max_completion_tokens, older models use max_tokens
    if (this.config.model.name.includes('gpt-5') || this.config.model.name.includes('o1')) {
      return { max_completion_tokens: maxTokens };
    } else {
      return { max_tokens: maxTokens };
    }
  }

  private getTemperatureParameter(temperature: number): { temperature?: number } {
    // GPT-5 and o1 models only support default temperature of 1
    if (this.config.model.name.includes('gpt-5') || this.config.model.name.includes('o1')) {
      if (!this.temperatureWarningShown) {
        console.log(`ℹ️  Note: ${this.config.model.name} uses default temperature (1) - custom temperature ignored`);
        this.temperatureWarningShown = true;
      }
      return {}; // Don't include temperature parameter
    } else {
      return { temperature };
    }
  }

  private cleanResponseContent(content: string): string {
    // Remove markdown code block formatting that some models add
    let cleaned = content.trim();
    
    // Handle various markdown code block formats
    const codeBlockPatterns = [
      /^```json\s*/i,
      /^```\s*/,
      /\s*```$/
    ];
    
    // Remove opening code block
    for (const pattern of codeBlockPatterns.slice(0, 2)) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '');
        break;
      }
    }
    
    // Remove closing code block
    cleaned = cleaned.replace(codeBlockPatterns[2], '');
    
    // Remove any leading/trailing whitespace and newlines
    cleaned = cleaned.trim();
    
    // Remove any remaining backticks at start/end
    if (cleaned.startsWith('`')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.endsWith('`')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    
    return cleaned.trim();
  }

  private async retryOpenAICall<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = this.config.analysis.retrySettings.maxRetries;
    const baseDelay = this.config.analysis.retrySettings.baseDelayMs;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries + 1;
        
        if (isLastAttempt) {
          throw error;
        }

        // Only retry on specific error types
        const shouldRetry = error instanceof Error && (
          error.message.includes('No response content') ||
          error.message.includes('Invalid JSON response') ||
          error.message.includes('Invalid analysis format') ||
          error.message.includes('rate limit') ||
          error.message.includes('timeout') ||
          error.message.includes('502') ||
          error.message.includes('503') ||
          error.message.includes('504')
        );

        if (!shouldRetry) {
          throw error;
        }

        const delay = baseDelay * Math.pow(1.5, attempt - 1); // Exponential backoff
        console.log(`⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms...`);
        console.log(`Error: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Unexpected retry loop exit');
  }

  private loadConfig(configPath?: string): LLMConfig {
    const defaultConfigPath = path.join(__dirname, 'llm-config.json');
    const configFilePath = configPath || defaultConfigPath;
    
    try {
      const configContent = fs.readFileSync(configFilePath, 'utf-8');
      const config = JSON.parse(configContent) as LLMConfig;
      
      // Validate required fields
      if (!config.model?.name || !config.analysis || !config.prompts) {
        throw new Error('Invalid config format: missing required fields');
      }
      
      console.log(`📋 Loaded config: ${config.model.name} model`);
      return config;
    } catch (error) {
      console.warn(`⚠️  Could not load config from ${configFilePath}:`, (error as Error).message);
      console.log('📋 Using default configuration');
      
      // Return default config
      return {
        model: {
          name: "gpt-4o-mini",
          temperature: 0.3,
          maxTokens: {
            categoryExtraction: 200,
            episodeAnalysis: 300
          }
        },
        analysis: {
          maxCategories: 7,
          maxTagsPerEpisode: 3,
          rateLimitDelayMs: 1000,
          progressSaveInterval: 5,
          retrySettings: {
            maxRetries: 2,
            baseDelayMs: 2000
          },
          presetCategories: [
            "Искусственный интеллект",
            "Устройства и гаджеты", 
            "Программное обеспечение",
            "Конфиденциальность и безопасность",
            "Технологические компании",
            "Интернет и облачные сервисы",
            "Будущее технологий"
          ]
        },
        prompts: {
          categoryExtraction: {
            systemMessage: "You are an expert at analyzing Russian technology podcast content and extracting meaningful categories.",
            temperature: 0.3
          },
          episodeAnalysis: {
            systemMessage: "You are an expert at analyzing individual podcast episodes and assigning relevant tags from predefined categories.",
            temperature: 0.2
          }
        }
      };
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

  // DEPRECATED: This method is no longer used since we now use preset categories from config
  private async extractCommonCategories(episodes: Episode[]): Promise<string[]> {
    const allDescriptions = episodes.map(ep => ep.description).join('\n\n');
    
    const prompt = `Analyze the following podcast episode descriptions from a Russian technology podcast called "Технологии и жизнь" (Technology and Life). 

Extract exactly ${this.config.analysis.maxCategories} common categories that best represent the main topics discussed across all episodes. Categories should be:
- In Russian
- Broad enough to cover multiple episodes
- Technology and life focused
- Representative of the podcast's main themes

Episode descriptions:
${allDescriptions.substring(0, 15000)} // Truncate if too long

Return ONLY a JSON array of exactly ${this.config.analysis.maxCategories} category names in Russian. Do not wrap the response in markdown code blocks.

Example format:
["Искусственный интеллект", "Программирование", "Путешествия", "Философия технологий", "Социальные сети", "Виртуальная реальность", "Цифровая приватность"]`;

    try {
      return await this.retryOpenAICall(async () => {
        const tokensParam = this.getTokensParameter(this.config.model.maxTokens.categoryExtraction);
        const temperatureParam = this.getTemperatureParameter(this.config.prompts.categoryExtraction.temperature);
        const response = await this.openai.chat.completions.create({
          model: this.config.model.name,
          messages: [
            { role: "system", content: this.config.prompts.categoryExtraction.systemMessage },
            { role: "user", content: prompt }
          ],
          ...temperatureParam,
          ...tokensParam
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn('⚠️  OpenAI returned empty response for category extraction');
          console.log('Response details:', JSON.stringify({
            choices: response.choices?.length || 0,
            hasMessage: !!response.choices?.[0]?.message,
            finishReason: response.choices?.[0]?.finish_reason
          }, null, 2));
          throw new Error(`No response content from OpenAI. Response had ${response.choices?.length || 0} choices.`);
        }

        let categories;
        try {
          const cleanedContent = this.cleanResponseContent(content);
          categories = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.warn('⚠️  Failed to parse OpenAI response as JSON');
          console.log('Raw response content:', content);
          const cleanedContent = this.cleanResponseContent(content);
          console.log('Cleaned content:', cleanedContent);
          throw new Error(`Invalid JSON response from OpenAI: ${(parseError as Error).message}`);
        }
        if (!Array.isArray(categories) || categories.length !== this.config.analysis.maxCategories) {
          throw new Error(`Invalid categories format: expected ${this.config.analysis.maxCategories} categories, got ${categories?.length || 0}`);
        }

        return categories;
      }, 'Category extraction');
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
    const prompt = `Analyze this Russian podcast episode and assign up to ${this.config.analysis.maxTagsPerEpisode} relevant tags from the provided categories.

Episode Title: ${episode.title}
Episode Description: ${episode.description.substring(0, 2000)}

Available Categories: ${categories.join(', ')}

Instructions:
- Choose 1-${this.config.analysis.maxTagsPerEpisode} most relevant categories that match this episode's content
- Provide a brief 1-sentence summary in Russian
- Return as JSON format without markdown code blocks

Example response:
{
  "tags": ["Искусственный интеллект", "Программирование"],
  "summary": "Обсуждение развития ИИ и его влияния на программирование."
}`;

    try {
      return await this.retryOpenAICall(async () => {
        const tokensParam = this.getTokensParameter(this.config.model.maxTokens.episodeAnalysis);
        const temperatureParam = this.getTemperatureParameter(this.config.prompts.episodeAnalysis.temperature);
        const response = await this.openai.chat.completions.create({
          model: this.config.model.name,
          messages: [
            { role: "system", content: this.config.prompts.episodeAnalysis.systemMessage },
            { role: "user", content: prompt }
          ],
          ...temperatureParam,
          ...tokensParam
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.warn(`⚠️  OpenAI returned empty response for episode ${episode.episodeNumber}`);
          console.log('Response details:', JSON.stringify({
            choices: response.choices?.length || 0,
            hasMessage: !!response.choices?.[0]?.message,
            finishReason: response.choices?.[0]?.finish_reason
          }, null, 2));
          throw new Error(`No response content from OpenAI for episode ${episode.episodeNumber}. Response had ${response.choices?.length || 0} choices.`);
        }

        let analysis;
        try {
          const cleanedContent = this.cleanResponseContent(content);
          analysis = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.warn(`⚠️  Failed to parse OpenAI response as JSON for episode ${episode.episodeNumber}`);
          console.log('Raw response content:', content);
          const cleanedContent = this.cleanResponseContent(content);
          console.log('Cleaned content:', cleanedContent);
          throw new Error(`Invalid JSON response from OpenAI for episode ${episode.episodeNumber}: ${(parseError as Error).message}`);
        }

        // Validate analysis structure
        if (!analysis.tags || !Array.isArray(analysis.tags)) {
          console.warn(`⚠️  Invalid analysis structure for episode ${episode.episodeNumber}: missing or invalid tags`);
          console.log('Analysis object:', analysis);
          throw new Error(`Invalid analysis format for episode ${episode.episodeNumber}: tags must be an array`);
        }

        if (!analysis.summary || typeof analysis.summary !== 'string') {
          console.warn(`⚠️  Invalid analysis structure for episode ${episode.episodeNumber}: missing or invalid summary`);
          console.log('Analysis object:', analysis);
          throw new Error(`Invalid analysis format for episode ${episode.episodeNumber}: summary must be a string`);
        }
        
        return {
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          tags: analysis.tags.slice(0, this.config.analysis.maxTagsPerEpisode), // Ensure max tags per config
          summary: analysis.summary
        };
      }, `Episode ${episode.episodeNumber} analysis`);
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

  private parseEpisodeRange(rangeStr: string, totalEpisodes: number): EpisodeRange | null {
    if (!rangeStr) return null;

    // Handle "last N" format
    const lastMatch = rangeStr.match(/^last\s+(\d+)$/i);
    if (lastMatch) {
      const count = parseInt(lastMatch[1]);
      return {
        start: Math.max(1, totalEpisodes - count + 1),
        end: totalEpisodes
      };
    }

    // Handle "N-M" format
    const rangeMatch = rangeStr.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      
      if (start <= end && start >= 1 && end <= totalEpisodes) {
        return { start, end };
      } else {
        throw new Error(`Invalid range: ${rangeStr}. Start must be <= end, and both must be between 1 and ${totalEpisodes}`);
      }
    }

    // Handle single episode number
    const singleMatch = rangeStr.match(/^(\d+)$/);
    if (singleMatch) {
      const episodeNum = parseInt(singleMatch[1]);
      if (episodeNum >= 1 && episodeNum <= totalEpisodes) {
        return { start: episodeNum, end: episodeNum };
      } else {
        throw new Error(`Invalid episode number: ${episodeNum}. Must be between 1 and ${totalEpisodes}`);
      }
    }

    throw new Error(`Invalid range format: ${rangeStr}. Use formats like "140-160", "last 5", or "163"`);
  }

  private filterEpisodesByRange(episodes: Episode[], range: EpisodeRange | null): Episode[] {
    if (!range) return episodes;
    
    return episodes.filter(episode => 
      episode.episodeNumber >= range.start && episode.episodeNumber <= range.end
    );
  }

  public async analyzePodcast(feedPath: string, episodeRange?: string): Promise<AnalysisProgress> {
    console.log('🎧 Starting podcast analysis...');
    
    // Parse episodes
    const allEpisodes = await this.parsePodcastFeed(feedPath);
    console.log(`📊 Found ${allEpisodes.length} episodes`);

    // Parse and apply episode range filter
    let range: EpisodeRange | null = null;
    let episodes = allEpisodes;
    
    if (episodeRange) {
      try {
        range = this.parseEpisodeRange(episodeRange, allEpisodes.length);
        if (range) {
          episodes = this.filterEpisodesByRange(allEpisodes, range);
          console.log(`🎯 Filtering to episodes ${range.start}-${range.end} (${episodes.length} episodes)`);
        }
      } catch (error) {
        console.error(`❌ ${(error as Error).message}`);
        process.exit(1);
      }
    }

    // Load existing progress
    let progress = this.loadProgress();
    let startFromEpisode = 0;

    if (progress && !episodeRange) {
      console.log(`📋 Resuming from episode ${progress.lastProcessedEpisode + 1}`);
      startFromEpisode = progress.lastProcessedEpisode;
      this.commonCategories = progress.commonCategories;
    } else if (episodeRange) {
      console.log(`🔄 Processing specified range, ignoring previous progress`);
    }

    // Use preset categories from config
    if (this.commonCategories.length === 0) {
      console.log('🏷️  Using preset categories from configuration...');
      this.commonCategories = this.config.analysis.presetCategories;
      console.log('📂 Categories:', this.commonCategories);
    }

    // Initialize or update progress
    if (!progress || episodeRange) {
      progress = {
        lastProcessedEpisode: 0,
        totalEpisodes: episodeRange ? allEpisodes.length : episodes.length,
        processedAt: new Date().toISOString(),
        commonCategories: this.commonCategories,
        episodeAnalyses: progress?.episodeAnalyses || []
      };
    } else {
      progress.commonCategories = this.commonCategories;
      progress.totalEpisodes = episodes.length;
    }

    // Process episodes
    let episodesToProcess: Episode[];
    if (episodeRange) {
      // Process only the episodes in the specified range
      episodesToProcess = episodes;
    } else {
      // Resume from where we left off
      episodesToProcess = episodes.slice(startFromEpisode);
    }
    
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

      // Save progress every N episodes (from config)
      if ((i + 1) % this.config.analysis.progressSaveInterval === 0) {
        this.saveProgress(progress);
      }

      // Rate limiting - wait configured time between requests
      await new Promise(resolve => setTimeout(resolve, this.config.analysis.rateLimitDelayMs));
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

  // Check for config flag
  let configPath: string | undefined;
  let filteredArgs = args;
  const configIndex = args.findIndex(arg => arg === '--config');
  if (configIndex !== -1 && configIndex + 1 < args.length) {
    configPath = args[configIndex + 1];
    filteredArgs = args.filter((_, i) => i !== configIndex && i !== configIndex + 1);
  }

  const analyzer = new PodcastAnalyzer(process.env.OPENAI_API_KEY, configPath);

  switch (filteredArgs[0]) {
    case 'analyze':
      const feedPath = filteredArgs[1] || 'public/podcast-feed.xml';
      const episodeRange = filteredArgs[2]; // Optional range parameter
      await analyzer.analyzePodcast(feedPath, episodeRange);
      break;
    
    case 'status':
      analyzer.getProgressSummary();
      break;
    
    default:
      console.log(`
🎧 Podcast Analyzer

Usage:
  npm run analyze-podcast analyze [feed-path] [episode-range] [--config config-path]  - Analyze podcast feed
  npm run analyze-podcast status [--config config-path]                              - Show analysis progress

Parameters:
  feed-path      Optional path to podcast feed XML (default: public/podcast-feed.xml)
  episode-range  Optional episode range to analyze:
                 - "140-160"    Analyze episodes 140 to 160
                 - "last 5"     Analyze the last 5 episodes
                 - "163"        Analyze only episode 163
  --config       Optional path to LLM config file (default: scripts/utils/podcast-analyzer/llm-config.json)

Environment:
  OPENAI_API_KEY - Required OpenAI API key

Examples:
  npm run analyze-podcast analyze
  npm run analyze-podcast analyze public/podcast-feed.xml
  npm run analyze-podcast analyze public/podcast-feed.xml "140-160"
  npm run analyze-podcast analyze public/podcast-feed.xml "last 5" --config custom-config.json
  npm run analyze-podcast analyze public/podcast-feed.xml "163"
  npm run analyze-podcast status
  npm run analyze-podcast status --config custom-config.json
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PodcastAnalyzer, type AnalysisProgress, type EpisodeAnalysis }; 