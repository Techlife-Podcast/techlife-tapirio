# scripts/utils/podcast-analyzer/README.md

# Podcast Analyzer

A TypeScript script that analyzes podcast descriptions using OpenAI to extract common categories and assign tags to episodes.

## Features

- 🏷️ Uses predefined categories for consistent episode tagging
- 📝 Assigns configurable number of relevant tags per episode  
- 💾 Saves analysis progress and can resume from interruptions
- 🔄 Rate-limited OpenAI API calls to avoid hitting limits
- 📊 Provides progress summaries and tag usage statistics
- 🎯 Supports episode range filtering (e.g., "140-160", "last 5", single episodes)
- ⚙️ Configurable LLM settings via JSON config file
- 🔄 Robust error handling with automatic retries and detailed logging
- 🛡️ Intelligent fallback mechanisms for API failures

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up OpenAI API key:**
   Create a `.env` file in the project root:
   ```bash
   # Get your API key from: https://platform.openai.com/api-keys
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Configuration

The analyzer uses an LLM configuration file to control model settings and analysis parameters. The default config is located at `scripts/utils/podcast-analyzer/llm-config.json`.

### Default Configuration
```json
{
  "model": {
    "name": "gpt-5",
    "temperature": 0.3,
    "maxTokens": {
      "categoryExtraction": 200,
      "episodeAnalysis": 300
    }
  },
  "analysis": {
    "maxCategories": 7,
    "maxTagsPerEpisode": 3,
    "rateLimitDelayMs": 1000,
    "progressSaveInterval": 5,
    "retrySettings": {
      "maxRetries": 2,
      "baseDelayMs": 2000
    },
    "presetCategories": [
      "Искусственный интеллект",
      "Устройства и гаджеты",
      "Программное обеспечение",
      "Конфиденциальность и безопасность",
      "Технологические компании",
      "Интернет и облачные сервисы",
      "Будущее технологий"
    ]
  },
  "prompts": {
    "categoryExtraction": {
      "systemMessage": "You are an expert at analyzing Russian technology podcast content and extracting meaningful categories.",
      "temperature": 0.3
    },
    "episodeAnalysis": {
      "systemMessage": "You are an expert at analyzing individual podcast episodes and assigning relevant tags from predefined categories.",
      "temperature": 0.2
    }
  }
}
```

### Configuration Options
- **model.name**: OpenAI model to use (e.g., "gpt-4o-mini", "gpt-5", "o1-preview")
- **model.temperature**: Global temperature for the model
- **model.maxTokens**: Maximum tokens for different operations (automatically uses correct parameter for each model)
- **analysis.maxCategories**: Number of categories to extract (default: 7)
- **analysis.maxTagsPerEpisode**: Maximum tags per episode (default: 3)
- **analysis.rateLimitDelayMs**: Delay between API calls in milliseconds
- **analysis.progressSaveInterval**: Save progress every N episodes
- **analysis.retrySettings**: Retry configuration for failed API calls
  - **maxRetries**: Number of retry attempts (default: 2)
  - **baseDelayMs**: Base delay between retries in milliseconds (default: 2000)
- **analysis.presetCategories**: Array of predefined categories to use for episode tagging
- **prompts**: System messages and temperatures for different operations

**Note**: The analyzer automatically handles model-specific parameter differences:
- **Token parameters**: `max_tokens` (older models) vs `max_completion_tokens` (GPT-5, o1 models)
- **Temperature**: Custom values (older models) vs default only (GPT-5, o1 models use temperature=1)

## Usage

### Analyze podcast feed
```bash
npm run analyze-podcast analyze
# or specify custom feed path
npm run analyze-podcast analyze public/podcast-feed.xml
# or analyze specific episode range
npm run analyze-podcast analyze public/podcast-feed.xml "140-160"
npm run analyze-podcast analyze public/podcast-feed.xml "last 5"
npm run analyze-podcast analyze public/podcast-feed.xml "163"
# or use custom config
npm run analyze-podcast -- analyze public/podcast-feed.xml "last 5" --config custom-config.json
```

### Check progress
```bash
npm run analyze-podcast status
# or with custom config
npm run analyze-podcast -- status --config custom-config.json
```

### Help
```bash
npm run analyze-podcast
```

## Output

The script creates:
- `data/podcast-analysis-progress.json` - Complete analysis results and progress tracking

## Example Output

```json
{
  "lastProcessedEpisode": 163,
  "totalEpisodes": 163,
  "processedAt": "2025-01-27T10:30:00.000Z",
  "commonCategories": [
    "Искусственный интеллект",
    "Программирование", 
    "Путешествия",
    "Философия технологий",
    "Цифровая приватность",
    "Виртуальная реальность",
    "Социальные технологии"
  ],
  "episodeAnalyses": [
    {
      "episodeNumber": 163,
      "title": "#163: Вайб-кодинг",
      "tags": ["Искусственный интеллект", "Программирование"],
      "summary": "Обсуждение развития ИИ и его влияния на программирование."
    }
  ]
}
```

## Integration with Build Process

Add to your build pipeline:
```bash
npm run analyze-podcast analyze && npm run build
```
