const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

// Question page handler
function questionPageHandler(req, res) {
    res.render("voprosy", {
        projectInfo: req.app.locals.projectInfo,
        path: req.path,
        pageTitle: "Задать вопрос",
        pageDescription: "Задайте свой вопрос ведущим подкаста Технологии и жизнь",
    });
}

// In-memory rate limiting store (simple implementation)
const submissionStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_SUBMISSIONS = 3; // Max 3 submissions per minute per IP

// Minimum time (in milliseconds) user must spend before submitting
const MIN_FORM_TIME = 3000; // 3 seconds

// Question submission handler
async function questionSubmissionHandler(req, res) {
    try {
        const { name, email, question, category, privacy, website, formStartTime } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;

        // 1. HONEYPOT CHECK: If website field is filled, it's a bot
        if (website && website.trim()) {
            console.log(`Bot detected (honeypot): IP ${clientIp}`);
            // Return success to fool the bot
            return res.json({ success: true, message: "Вопрос успешно отправлен" });
        }

        // 2. TIME-BASED VALIDATION: Check if form was submitted too quickly
        if (formStartTime) {
            const timeSpent = Date.now() - parseInt(formStartTime);
            if (timeSpent < MIN_FORM_TIME) {
                console.log(`Bot detected (too fast): IP ${clientIp}, time: ${timeSpent}ms`);
                // Return success to fool the bot
                return res.json({ success: true, message: "Вопрос успешно отправлен" });
            }
        }

        // 3. RATE LIMITING: Check submission frequency
        const now = Date.now();
        const userSubmissions = submissionStore.get(clientIp) || [];

        // Remove old submissions outside the time window
        const recentSubmissions = userSubmissions.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW
        );

        if (recentSubmissions.length >= MAX_SUBMISSIONS) {
            console.log(`Rate limit exceeded: IP ${clientIp}`);
            return res.status(429).json({
                error: "Слишком много запросов. Пожалуйста, подождите минуту перед следующей отправкой."
            });
        }

        // Add current submission timestamp
        recentSubmissions.push(now);
        submissionStore.set(clientIp, recentSubmissions);

        // Clean up old entries periodically (every 100 requests)
        if (Math.random() < 0.01) {
            for (const [ip, timestamps] of submissionStore.entries()) {
                const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
                if (validTimestamps.length === 0) {
                    submissionStore.delete(ip);
                } else {
                    submissionStore.set(ip, validTimestamps);
                }
            }
        }

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
}

// Question page routes
router.get("/voprosy", questionPageHandler);
router.get("/ask", questionPageHandler);
router.get("/contact", questionPageHandler);
router.get("/question", questionPageHandler);

// Question submission routes
router.post("/voprosy", questionSubmissionHandler);
router.post("/ask", questionSubmissionHandler);
router.post("/contact", questionSubmissionHandler);
router.post("/question", questionSubmissionHandler);

module.exports = router;