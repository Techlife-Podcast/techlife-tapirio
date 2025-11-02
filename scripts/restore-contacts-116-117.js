const fs = require('fs');
const path = require('path');

const NEW_BOILERPLATE = `<p>📺 <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast">Наш канал на Youtube</a></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://podcasts.apple.com/podcast/tehnologii-i-zizn/id1013700516?mt=2">наш подкаст в директории подкастов Apple</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://overcast.fm/itunes1013700516">в Overcast</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast/podcasts">YouTube подкастах</a>, <br><a target="_blank" rel="noopener noreferrer nofollow" href="https://open.spotify.com/show/03re4PmocsgPtLBtIxVK4m">Spotify</a> и <a target="_blank" rel="noopener noreferrer nofollow" href="https://music.yandex.ru/album/7322142">на Яндекс Музыке</a></p>`;

const CONTACTS_DIMKA_117 = `<p><strong>Как ещё можно найти Диму:</strong></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://twitter.com/dimka">twitter.com/dimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://instagram.com/thedimka">instagram.com/thedimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://flickr.com/thedimka">flickr.com/thedimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://thedimka.livejournal.com">thedimka.livejournal.com</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="http://facebook.com/thedimka">facebook.com/thedimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://youtube.com/thedimka">youtube.com/thedimka</a></p><p><strong>И как найти Васю:</strong></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://instagram.com/vasily">instagram.com/vasily</a></p>`;

const CONTACTS_DIMKA_116 = `<p><strong>Как ещё можно найти Диму:</strong></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://twitter.com/dimka">twitter.com/dimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://instagram.com/thedimka">instagram.com/thedimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://flickr.com/thedimka">flickr.com/thedimka</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://thedimka.livejournal.com">thedimka.livejournal.com</a><br><a target="_blank" rel="noopener noreferrer nofollow" href="https://facebook.com/thedimka">facebook.com/thedimka</a></br><a target="_blank" rel="noopener noreferrer nofollow" href="https://youtube.com/thedimka">youtube.com/thedimka</a></p><p><strong>И как найти Васю:</strong></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="http://instagram.com/vasily">instagram.com/vasily</a></p>`;

const FEED_PATH = path.join(__dirname, '..', 'public', 'podcast-feed.xml');

console.log('Загрузка podcast feed...');
let content = fs.readFileSync(FEED_PATH, 'utf8');

// Эпизод 117
console.log('Восстановление контактов для эпизода #117...');
content = content.replace(
  /(<title>#117:.*?<\/ul>)<p>📺.*?(<\/content:encoded>)/s,
  (match, before, after) => {
    return before + CONTACTS_DIMKA_117 + NEW_BOILERPLATE + ']]>\n      ' + after;
  }
);

// Эпизод 116
console.log('Восстановление контактов для эпизода #116...');
content = content.replace(
  /(<title>#116:.*?<\/ul>)<p>📺.*?(<\/content:encoded>)/s,
  (match, before, after) => {
    return before + CONTACTS_DIMKA_116 + NEW_BOILERPLATE + ']]>\n      ' + after;
  }
);

fs.writeFileSync(FEED_PATH, content);
console.log('✅ Контакты восстановлены для эпизодов 116 и 117!');
