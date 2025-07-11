// scripts/test-analyzer.js
// Simple test script to verify XML parsing works

const fs = require('fs');
const xml2js = require('xml2js');

async function testFeedParsing() {
    try {
        console.log('🧪 Testing podcast feed parsing...');

        const feedContent = fs.readFileSync('public/podcast-feed.xml', 'utf-8');
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(feedContent);

        const episodes = result.rss.channel[0].item.slice(0, 3); // Just test first 3

        console.log(`✅ Successfully parsed feed with ${result.rss.channel[0].item.length} episodes`);
        console.log('\n📝 Sample episodes:');

        episodes.forEach((item, index) => {
            const titleMatch = item.title[0].match(/#(\d+):/);
            const episodeNumber = titleMatch ? parseInt(titleMatch[1]) : index + 1;
            const description = item.description[0].replace(/<[^>]*>/g, '').substring(0, 100);

            console.log(`\n  Episode ${episodeNumber}: ${item.title[0]}`);
            console.log(`  Description: ${description}...`);
        });

        console.log('\n✅ Feed parsing test successful!');
        console.log('\n🚀 Ready to run: npm run analyze-podcast analyze');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFeedParsing();