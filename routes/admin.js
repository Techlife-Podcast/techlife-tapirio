const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { CATEGORY_NAMES } = require('../constants/categories');

// Admin page for viewing question submissions
router.get("/voprosy", async(req, res) => {
    try {
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
            return CATEGORY_NAMES[category] || 'Другое';
        };

        res.render("voprosy-admin", {
            questions: processedQuestions,
            getCategoryName,
            projectInfo: req.app.locals.projectInfo,
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