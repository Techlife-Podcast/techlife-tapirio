# scripts/README.md

# Podcast Analyzer

A TypeScript script that analyzes podcast descriptions using OpenAI to extract common categories and assign tags to episodes.

## Features

- 🏷️ Extracts exactly 7 common categories from all podcast episodes
- 📝 Assigns up to 3 relevant tags per episode  
- 💾 Saves analysis progress and can resume from interruptions
- 🔄 Rate-limited OpenAI API calls to avoid hitting limits
- 📊 Provides progress summaries and tag usage statistics

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

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

### Analyze podcast feed
```bash
npm run analyze-podcast analyze
# or specify custom feed path
npm run analyze-podcast analyze public/podcast-feed.xml
```

### Check progress
```bash
npm run analyze-podcast status
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