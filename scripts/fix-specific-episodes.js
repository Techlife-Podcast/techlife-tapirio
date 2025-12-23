const fs = require('fs');
const path = require('path');

// Новый boilerplate
const NEW_BOILERPLATE = `<p>📺 <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast">Наш канал на Youtube</a></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://podcasts.apple.com/podcast/tehnologii-i-zizn/id1013700516?mt=2">наш подкаст в директории подкастов Apple</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://overcast.fm/itunes1013700516">в Overcast</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast/podcasts">YouTube подкастах</a>, <br><a target="_blank" rel="noopener noreferrer nofollow" href="https://open.spotify.com/show/03re4PmocsgPtLBtIxVK4m">Spotify</a> и <a target="_blank" rel="noopener noreferrer nofollow" href="https://music.yandex.ru/album/7322142">на Яндекс Музыке</a></p>`;

const FEED_PATH = path.join(__dirname, '..', 'public', 'podcast-feed.xml');

console.log('Восстановление из backup...');
fs.copyFileSync(FEED_PATH + '.backup', FEED_PATH);

console.log('Загрузка podcast feed...');
let content = fs.readFileSync(FEED_PATH, 'utf8');

// Функция для замены контента в эпизоде
const fixEpisode = (episodeNum, fixFunction) => {
  const itemRegex = new RegExp(`(<item>\\s*<title>#${episodeNum}:.*?</item>)`, 's');
  const match = content.match(itemRegex);

  if (match) {
    const oldItem = match[1];
    const newItem = fixFunction(oldItem);
    content = content.replace(oldItem, newItem);
    console.log(`✓ Исправлен эпизод #${episodeNum}`);
    return true;
  } else {
    console.log(`✗ Не найден эпизод #${episodeNum}`);
    return false;
  }
};

// Исправляем эпизод 163 - удаляем некорректный boilerplate из последнего <li>
fixEpisode(163, (item) => {
  // Находим и удаляем boilerplate, который находится внутри последнего <li>
  item = item.replace(
    /(<li><p><a[^>]*>Claude от Anthropic<\/a><\/p>)<p><br><\/p>.*?<\/li><\/ul>/s,
    '$1</li></ul>' + NEW_BOILERPLATE
  );
  return item;
});

// Исправляем эпизод 137 - заменяем после </ol>
fixEpisode(137, (item) => {
  item = item.replace(
    /<\/ol><p>📺.*?<\/p><p>.*?на Яндекс Музыке<\/a><\/p>/s,
    '</ol>' + NEW_BOILERPLATE
  );
  return item;
});

// Исправляем эпизод 117 - сохраняем контакты, заменяем только boilerplate
fixEpisode(117, (item) => {
  // Сохраняем всё до "Наш канал на Youtube"
  item = item.replace(
    /<p>📺 <a[^>]*>Наш канал на Youtube<\/a><\/p><p><a[^>]*>.*?на Яндекс Музыке<\/a><\/p>/s,
    NEW_BOILERPLATE
  );
  return item;
});

// Исправляем эпизод 116 - сохраняем контакты, заменяем только boilerplate
fixEpisode(116, (item) => {
  // Сохраняем всё до "Наш канал на Youtube"
  item = item.replace(
    /<p>📺 <a[^>]*>Наш канал на Youtube<\/a><\/p><p><a[^>]*>.*?на Яндекс Музыке<\/a><\/p>/s,
    NEW_BOILERPLATE
  );
  return item;
});

// Сохраняем исправленный файл
fs.writeFileSync(FEED_PATH, content);

console.log('\n✅ Все проблемные эпизоды исправлены!');
