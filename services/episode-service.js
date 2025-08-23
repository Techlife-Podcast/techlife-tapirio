const path = require('path');
const fs = require('fs-extra');
const { processEpisodes } = require('../scripts/utils/episode-processor');

/**
 * Load episode analysis data with tags from JSON file
 * @returns {Array} Array of episode analyses
 */
function loadEpisodeAnalysis() {
    try {
        const analysisPath = path.join(__dirname, "..", "data", "podcast-analysis-progress.json");
        if (fs.existsSync(analysisPath)) {
            const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
            return analysisData.episodeAnalyses || [];
        }
    } catch (error) {
        console.warn('Could not load episode analysis data:', error.message);
    }
    return [];
}

/**
 * Merge episode data with analysis tags and summaries
 * @param {Array} episodes - Raw episode data
 * @param {Array} analyses - Episode analysis data
 * @returns {Array} Episodes merged with analysis data
 */
function mergeEpisodesWithTags(episodes, analyses) {
    const analysisMap = analyses.reduce((map, analysis) => {
        map[analysis.episodeNumber] = analysis;
        return map;
    }, {});

    return episodes.map(episode => {
        const episodeNum = parseInt(episode.episodeNum);
        const analysis = analysisMap[episodeNum];

        return {
            ...episode,
            tags: analysis ? analysis.tags : [],
            summary: analysis ? analysis.summary : null
        };
    });
}

/**
 * Process and enrich episodes with analysis data
 * @param {Object} podcastData - Raw podcast RSS data
 * @returns {Array} Processed and enriched episodes
 */
function processAndEnrichEpisodes(podcastData) {
    const processedEpisodes = processEpisodes(podcastData.channel.item);
    const episodeAnalyses = loadEpisodeAnalysis();
    return mergeEpisodesWithTags(processedEpisodes, episodeAnalyses);
}

/**
 * Get all unique tags from episodes with counts
 * @param {Array} episodes - Array of episodes
 * @returns {Array} Array of tag objects with name and count, sorted alphabetically
 */
function getAllPodcastTags(episodes) {
    const tagCounts = {};
    episodes.forEach(episode => {
        if (episode.tags && episode.tags.length > 0) {
            episode.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    // Convert to array of objects with tag name and count, sorted alphabetically
    return Object.entries(tagCounts)
        .map(([tag, count]) => ({ name: tag, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get episodes filtered by tag
 * @param {Array} episodes - Array of episodes
 * @param {string} tagName - Tag to filter by
 * @returns {Array} Episodes with the specified tag, sorted by episode number (newest first)
 */
function getEpisodesByTag(episodes, tagName) {
    return episodes.filter(episode =>
        episode.tags && episode.tags.includes(tagName)
    ).sort((a, b) => parseInt(b.episodeNum) - parseInt(a.episodeNum));
}

module.exports = {
    loadEpisodeAnalysis,
    mergeEpisodesWithTags,
    processAndEnrichEpisodes,
    getAllPodcastTags,
    getEpisodesByTag
};