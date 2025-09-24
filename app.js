// app.js
require('dotenv').config({ path: '.server' }); // Keep at very top

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
// const sassMiddleware = require("sass-middleware"); // Removed - now using Vite for SCSS compilation
const helmet = require("helmet");

const indexRouter = require("./routes/router");
const usersRouter = require("./routes/users");

// Cache busting for assets
const CacheBuster = require('./scripts/cache-buster');
const cacheBuster = new CacheBuster();

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "pages"));
app.set("view engine", "pug");

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "stackpath.bootstrapcdn.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "www.googletagmanager.com", "www.google-analytics.com", "unpkg.com", "plausible.io"],
            imgSrc: ["'self'", "data:", "*.tapirio.com", "techlifepodcast.com", "*.techlifepodcast.com", "www.google-analytics.com"],
            mediaSrc: ["'self'", "*.tapirio.com", "techlifepodcast.com", "*.techlifepodcast.com", "*.amazonaws.com"],
            connectSrc: ["'self'", "www.google-analytics.com", "plausible.io"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // For podcast audio embedding
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Middleware setup
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configure static file serving with explicit MIME types
app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Initialize project data
const Project = require("./scripts/app.functions");
const BLOG_PATH = path.join(__dirname, "content", "articles");
const PODCAST_FEED_XML = path.join(__dirname, "public", "podcast-feed.xml");

const project = new Project(BLOG_PATH, { podcastFeedXml: PODCAST_FEED_XML });

// This should be an async function
async function initializeProject() {
    await project.init();
    project.sortBy({ property: "date", asc: false });

    const podcast = project.podcastModule.json.rss;
    const episodes = podcast.channel.item.map((episode) => {
        return episode;
    });

    // Set up locals after data is initialized
    app.locals.episodes = episodes;
    app.locals.projectInfo = project.info;
    app.locals.projectInfo.currentYear = new Date().getFullYear();

    // Make cache buster available to templates
    app.locals.assetUrl = (assetPath) => cacheBuster.getAssetUrl(assetPath);

    console.log('Application initialization complete.');
}

// Call the initialization function
initializeProject().catch(console.error);

// Routes
app.use("/", indexRouter);
app.use("/users", usersRouter);

// Custom 404 handler
app.use(function(req, res, next) {
    // Check if the request is for a static asset (CSS, JS, images, etc.)
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|mp4|webm|pdf)$/i.test(req.path);

    if (isStaticAsset) {
        // For static assets, return a simple 404 without HTML rendering
        res.status(404).send('Not Found');
    } else {
        // For page requests, render the 404 page
        res.status(404).render('404', {
            message: "Запрашиваемая страница не найдена",
            title: "404 - Страница не найдена",
            path: req.path || ''
        });
    }
});

// Error handler
app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500);
    res.render("error", {
        path: req.path || ''
    });
});

// Remove the duplicate port setting and listening here since it's handled in www-techlife
module.exports = app;