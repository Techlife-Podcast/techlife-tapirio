// routes/router.js
const cors = require("cors");
const express = require("express");
const router = express.Router();
const path = require("path");
const Project = require("../scripts/app.functions");
const { processAndEnrichEpisodes, getAllPodcastTags, getEpisodesByTag } = require('../services/episode-service');

const statsRouter = require('./stats');
const adminRouter = require('./admin');
const questionsRouter = require('./questions');

// Constants
const BLOG_PATH = path.join(__dirname, "..", "content", "articles");
const PODCAST_FEED_XML = path.join(__dirname, "..", "public", "podcast-feed.xml");
const DEFAULT_IMAGE = "/images/bg-photo-02.jpg";

// Initialize project
const project = new Project(BLOG_PATH, { podcastFeedXml: PODCAST_FEED_XML });
let projectInfo = project.info;
let podcast = {};
let episodes = [];

// Update current year
projectInfo.currentYear = new Date().getFullYear();


async function initializeProject() {
    await project.init();
    project.sortBy({ property: "date", asc: false });

    podcast = project.podcastModule.json.rss;
    episodes = processAndEnrichEpisodes(podcast);

    // Make episodes available to the entire app
    router.use((req, res, next) => {
        req.app.locals.episodes = episodes;
        req.app.locals.podcast = podcast;
        next();
    });
}

initializeProject();

// Route handlers
router.get("/", (_req, res) => {
    res.render("index", {
        podcast,
        articles: project.posts,
        projectInfo,
        isHeroParallax: true,
        heroImg: DEFAULT_IMAGE,
        path: "home",
    });
});

router.get("/home-2021", (req, res) => {
    res.render("home-2021", {
        podcast,
        projectInfo,
        path: req.path,
        pageTitle: "О нас",
        isHeroParallax: true,
        heroImg: "/images/bg-techlife-kamas.jpg",
    });
});

router.get("/about", (req, res) => {
    res.render("about", {
        projectInfo,
        path: req.path,
        pageTitle: "О нас",
        isHeroParallax: true,
        heroImg: "/images/bg-techlife-kamas.jpg",
        pageDescription: "Авторы Дмитрий Здоров и Василий Мязин давние друзья и записывают подкаст о технологиях часто находясь в разных странах",
    });
});

router.get("/resources", (req, res) => {
    res.render("resources", {
        projectInfo,
        path: req.path,
        isHeroParallax: true,
        pageTitle: "Ресурсы",
        heroImg: "/images/bg-lightning.jpg",
        pageDescription: "Дополнительные материалы в качестве приложения к подкасту; статьи, картинки, ссылки и т. п.",
    });
});

router.use('/stats', (_req, res, next) => {
    res.locals.noIndex = true;
    next();
}, statsRouter);

router.use('/adminka', (_req, res, next) => {
    res.locals.noIndex = true;
    next();
}, adminRouter);

router.use('/', questionsRouter);

router.get("/guests", (req, res) => {
    res.render("guests", {
        projectInfo,
        path: req.path,
        isHeroParallax: true,
        pageTitle: "Инструкции для гостей подкаста",
        pageDescription: "Если вас пригласили на подкаст в гости, вам надо подготовится. Мы объясняем как это сделать.",
        heroImg: "",
        pageShareImg: "/images/og-techlife-guests-1200.jpg",
        noIndex: true,
    });
});

router.get("/api/episode/:id", cors(), (req, res) => {
    const episode = episodes.find((obj) => obj.episodeNum === req.params.id) || null;
    res.json(episode);
});

router.get("/episodes/:id", (req, res, next) => {
    const slug = req.params.id;
    const index = episodes.findIndex((obj) => obj.episodeNum === slug);

    if (index !== -1) {
        res.render("episode", {
            projectInfo,
            episode: episodes[index],
            nextEpisode: episodes[index + 1] || null,
            prevEpisode: episodes[index - 1] || null,
            path: req.path,
            isEpisodePage: true,
            isHeroParallax: true,
            heroImg: DEFAULT_IMAGE,
            layout: "episode",
        });
    } else {
        // Pass to the 404 handler
        next();
    }
});


router.get("/tags", (req, res) => {
    const podcastTags = getAllPodcastTags(episodes);

    res.render("podcast-tags", {
        podcastTags,
        isHeroParallax: true,
        heroImg: "/images/bg-lightning.jpg",
        pageShareImg: "/images/og-techlife-tags-1200.jpg",
        projectInfo,
        path: req.path,
        pageTitle: "Теги подкаста",
        pageDescription: "Все теги эпизодов подкаста Технологии и жизнь"
    });
});

router.get("/tags/:tag", async(req, res) => {
    const { tag } = req.params;
    const taggedEpisodes = getEpisodesByTag(episodes, tag);

    if (taggedEpisodes.length === 0) {
        return res.status(404).render("404");
    }

    res.render("podcast-tag", {
        tag,
        episodes: taggedEpisodes,
        isHeroParallax: true,
        heroImg: "/images/bg-lightning.jpg",
        pageShareImg: "/images/og-techlife-tags-1200.jpg",
        projectInfo,
        path: req.path,
        pageTitle: `Эпизоды по тегу: ${tag}`,
        pageDescription: `Все эпизоды подкаста с тегом "${tag}"`
    });
});

router.get("/blog", (req, res) => {
    res.render("blog", {
        articles: project.posts,
        projectInfo,
        isHeroParallax: true,
        heroImg: DEFAULT_IMAGE,
        path: req.path,
    });
});

// XML Sitemap for SEO
router.get("/sitemap.xml", (req, res) => {
    const baseUrl = 'https://www.techlifepodcast.com';
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/resources</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/tags</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/episodes.md</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

    // Add all episodes
    for (const episode of episodes) {
        xml += `  <url>
    <loc>${baseUrl}/episodes/${episode.episodeNum}</loc>
    <lastmod>${episode.pubDateConverted ? new Date(episode.pubDate).toISOString().split('T')[0] : today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Add all tags
    const { getAllPodcastTags } = require('../services/episode-service');
    const tags = getAllPodcastTags(episodes);
    for (const tag of tags) {
        xml += `  <url>
    <loc>${baseUrl}/tags/${encodeURIComponent(tag.name)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
});

// Plain markdown archive of all episodes
router.get("/episodes.md", (req, res) => {
    const { parse } = require("node-html-parser");
    
    const markdown = generateEpisodesMarkdown(episodes, podcast, parse);
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(markdown);
});

/**
 * Generate markdown text for all episodes
 * @param {Array} episodes - Array of processed episodes
 * @param {Object} podcast - Podcast metadata
 * @param {Function} parse - HTML parser function
 * @returns {string} Markdown formatted text
 */
function generateEpisodesMarkdown(episodes, podcast, parse) {
    const lines = [];
    
    // Header
    lines.push(`# Подкаст "${podcast.channel.title}"`);
    lines.push('');
    
    // Episodes (newest first - already sorted)
    for (const episode of episodes) {
        lines.push(`## №${episode.episodeNum} ${episode.title}`);
        lines.push(`### ${episode.pubDateConverted}`);
        lines.push('');
        
        // Краткое описание from itunes:subtitle
        const subtitle = episode['itunes:subtitle'];
        if (subtitle) {
            lines.push(`**Краткое описание:** ${subtitle}`);
            lines.push('');
        }
        
        // Full description - extract text from HTML
        if (episode.description) {
            const root = parse(episode.description);
            
            // Remove image tags
            root.querySelectorAll('img').forEach(img => img.remove());
            
            // Convert links to "Text (URL)" format
            root.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                const text = a.text.trim();
                if (href && text && !href.includes('youtube.com/@techlifepodcast')) {
                    a.replaceWith(`${text} (${href})`);
                } else {
                    a.replaceWith(text);
                }
            });
            
            // Get paragraphs
            const paragraphs = root.querySelectorAll('p');
            if (paragraphs.length > 0) {
                lines.push('### Описание');
                lines.push('');
                paragraphs.forEach(p => {
                    const text = p.text.trim();
                    if (text && !text.startsWith('📺') && !text.includes('наш подкаст в директории')) {
                        lines.push(text);
                        lines.push('');
                    }
                });
            }
            
            // Get list items (links section)
            const listItems = root.querySelectorAll('li');
            if (listItems.length > 0) {
                lines.push('### Ссылки');
                lines.push('');
                listItems.forEach(li => {
                    const text = li.text.trim();
                    if (text) {
                        lines.push(`- ${text}`);
                    }
                });
                lines.push('');
            }
        }
        
        lines.push('---');
        lines.push('');
    }
    
    return lines.join('\n');
}

router.get("/api/search", cors(), (req, res) => {
    const search = req.query.name.toLowerCase();
    const results = search ?
        project.posts.filter((a) =>
            (a.title + a.description + a.author).toLowerCase().includes(search)
        ) : [];
    res.json(results);
});

router.get("/blog/:filename", async(req, res) => {
    const { filename } = req.params;
    const postMetaData = project.getPostMetadata(filename);

    if (!postMetaData) {
        return res.status(404).render("blog-not-found", { slug: filename });
    }

    const content = await project.renderMarkdown(filename);
    res.render("article", {
        postMetaData,
        projectInfo,
        content,
        path: req.path,
        layout: "blog",
        isHeroParallax: true,
        heroImg: DEFAULT_IMAGE,
        isBlog: true,
        isBlogPost: true,
    });
});



module.exports = router;