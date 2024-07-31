// routes/stats.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { episodes, projectInfo } = req.app.locals;
    console.log(`Request path: ${req.path}`);

    console.log(`Total number of episodes: ${episodes.length}`);

    function parseDuration(duration) {
      if (typeof duration !== 'string') {
        console.log('Duration is not a string:', duration);
        return 0;
      }
    
      const parts = duration.split(':').map(part => parseInt(part, 10));

      if (parts.length === 2) {
        // MM:SS format
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        console.log('Unexpected duration format:', duration);
        return 0;
      }
    }
    
    const totalDuration = episodes.reduce((total, item, index) => {
      // Change this line to correctly access the itunes:duration field
      const duration = item['itunes:duration'] || item.duration;
      const parsedDuration = parseDuration(duration);
      return total + parsedDuration;
    }, 0);

    const totalHours = Math.round(totalDuration / 3600); // Convert seconds to hours and round
    console.log(`Total duration: ${totalDuration} seconds (${totalHours} hours)`);
      
    // You might want to replace these with actual data
    const listeners = 3433; 
    const countriesCount = 17;
    const guestsCount = 8;

    // Group by year
    const episodesByYear = episodes.reduce((acc, item) => {
      const year = new Date(item.pubDate).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {});

    res.render('stats', {
      projectInfo,
      listeners,
      totalHours: Math.round(totalDuration / 60 / 60), 
      countries: countriesCount,
      guests: guestsCount,
      episodesByYear,
      path: `${req.baseUrl}${req.path}`, // Adjusted path
      isHeroParallax: false,
      pageTitle: "Статистика подкаста",
      heroImg: "/images/bg-photo-02.jpg",
      pageDescription: "Визуализация статистики подкаста Технологии и жизнь",
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating visualization');
  }
});

module.exports = router;