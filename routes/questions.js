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

// Question submission handler
async function questionSubmissionHandler(req, res) {
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