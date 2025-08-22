// routes/index.js
const cors = require("cors");
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require('fs');
const Project = require("../scripts/app.functions");
const { processEpisodes } = require('../scripts/utils/episode-processor');

const statsRouter = require('./stats');

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

// Function to load episode analysis data with tags
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

// Function to merge episode data with analysis tags
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

async function initializeProject() {
    await project.init();
    project.sortBy({ property: "date", asc: false });

    podcast = project.podcastModule.json.rss;
    const processedEpisodes = processEpisodes(podcast.channel.item);

    // Load episode analysis and merge with episodes
    const episodeAnalyses = loadEpisodeAnalysis();
    episodes = mergeEpisodesWithTags(processedEpisodes, episodeAnalyses);

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

router.use('/stats', (req, res, next) => {
    res.locals.noIndex = true;
    next();
}, statsRouter);

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

// Function to get all unique tags from episodes with counts
function getAllPodcastTags() {
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

// Function to get episodes by tag
function getEpisodesByTag(tagName) {
    return episodes.filter(episode =>
        episode.tags && episode.tags.includes(tagName)
    ).sort((a, b) => parseInt(b.episodeNum) - parseInt(a.episodeNum)); // Sort by episode number, newest first
}

router.get("/tags", (req, res) => {
    const podcastTags = getAllPodcastTags();

    res.render("podcast-tags", {
        podcastTags,
        isHeroParallax: true,
        heroImg: "/images/bg-lightning.jpg",
        projectInfo,
        path: req.path,
        pageTitle: "Теги подкаста",
        pageDescription: "Все теги эпизодов подкаста Технологии и жизнь"
    });
});

router.get("/tags/:tag", async(req, res) => {
    const { tag } = req.params;
    const taggedEpisodes = getEpisodesByTag(tag);

    if (taggedEpisodes.length === 0) {
        return res.status(404).render("404");
    }

    res.render("podcast-tag", {
        tag,
        episodes: taggedEpisodes,
        isHeroParallax: true,
        heroImg: "/images/bg-lightning.jpg",
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

// Questions submission page with alternative routes
const questionPageHandler = (req, res) => {
    res.render("voprosy", {
        projectInfo,
        path: req.path,
        pageTitle: "Задать вопрос",
        pageDescription: "Задайте свой вопрос ведущим подкаста Технологии и жизнь",
    });
};

router.get("/voprosy", questionPageHandler);
router.get("/ask", questionPageHandler);
router.get("/contact", questionPageHandler);
router.get("/question", questionPageHandler);

// Handle question submissions for all question routes
const questionSubmissionHandler = async(req, res) => {
    try {
        const { name, email, question, category, privacy } = req.body;

        // Validate required fields
        if (!question || !question.trim()) {
            return res.status(400).json({ error: "Вопрос обязателен для заполнения" });
        }

        if (!privacy) {
            return res.status(400).json({ error: "Необходимо согласиться на обработку данных" });
        }

        // Create submission object
        const submission = {
            timestamp: new Date().toISOString(),
            name: name ? name.trim() : "Анонимный слушатель",
            email: email ? email.trim() : null,
            question: question.trim(),
            category: category || "other",
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };

        // Save to file
        const fs = require('fs-extra');
        const path = require('path');
        const questionsFile = path.join(__dirname, '..', 'content', 'listener-questions.json');

        // Ensure directory exists
        await fs.ensureDir(path.dirname(questionsFile));

        // Read existing questions or create empty array
        let questions = [];
        try {
            const existingData = await fs.readFile(questionsFile, 'utf8');
            questions = JSON.parse(existingData);
        } catch (err) {
            // File doesn't exist yet, start with empty array
            questions = [];
        }

        // Add new submission
        questions.push(submission);

        // Write back to file
        await fs.writeFile(questionsFile, JSON.stringify(questions, null, 2), 'utf8');

        res.json({ success: true, message: "Вопрос успешно отправлен" });

    } catch (error) {
        console.error('Error saving question:', error);
        res.status(500).json({ error: "Произошла ошибка при сохранении вопроса" });
    }
};

router.post("/voprosy", questionSubmissionHandler);
router.post("/ask", questionSubmissionHandler);
router.post("/contact", questionSubmissionHandler);
router.post("/question", questionSubmissionHandler);

// Admin page for viewing question submissions
router.get("/adminka/voprosy", async(req, res) => {
    try {
        const fs = require('fs-extra');
        const path = require('path');
        const questionsFile = path.join(__dirname, '..', 'content', 'listener-questions.json');

        let questions = [];
        try {
            const data = await fs.readFile(questionsFile, 'utf8');
            questions = JSON.parse(data);
        } catch (err) {
            // File doesn't exist or is empty
            questions = [];
        }

        // Process questions for display
        const processedQuestions = questions.map(q => ({
            ...q,
            formattedDate: new Date(q.timestamp).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            formattedTime: new Date(q.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            questionPreview: q.question.length > 100 ? q.question.substring(0, 100) : q.question
        }));

        // Sort by timestamp (newest first)
        processedQuestions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Helper function for category names
        const getCategoryName = (category) => {
            const categories = {
                'technology': 'Технологии',
                'philosophy': 'Философия',
                'travel': 'Путешествия',
                'security': 'ИИ',
                'lifestyle': 'Образ жизни',
                'future': 'Будущее',
                'other': 'Другое'
            };
            return categories[category] || 'Другое';
        };

        res.render("voprosy-admin", {
            questions: processedQuestions,
            getCategoryName,
            projectInfo,
            path: req.path,
            pageTitle: "Админ панель - Вопросы слушателей",
            noIndex: true // Don't index admin pages
        });

    } catch (error) {
        console.error('Error loading questions:', error);
        res.status(500).render('error', {
            message: 'Ошибка загрузки вопросов',
            error: req.app.get('env') === 'development' ? error : {}
        });
    }
});

module.exports = router;