const fs = require('fs');
const path = require('path');

// Новый boilerplate для вставки после </ul>
const NEW_BOILERPLATE = `<p>📺 <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast">Наш канал на Youtube</a></p><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://podcasts.apple.com/podcast/tehnologii-i-zizn/id1013700516?mt=2">наш подкаст в директории подкастов Apple</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://overcast.fm/itunes1013700516">в Overcast</a>,<br><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.youtube.com/@techlifepodcast/podcasts">YouTube подкастах</a>, <br><a target="_blank" rel="noopener noreferrer nofollow" href="https://open.spotify.com/show/03re4PmocsgPtLBtIxVK4m">Spotify</a> и <a target="_blank" rel="noopener noreferrer nofollow" href="https://music.yandex.ru/album/7322142">на Яндекс Музыке</a></p>`;

const FEED_PATH = path.join(__dirname, '..', 'public', 'podcast-feed.xml');

console.log('Загрузка podcast feed...');
let content = fs.readFileSync(FEED_PATH, 'utf8');

// Regex для поиска episode номера в title
const getEpisodeNumber = (itemText) => {
  const match = itemText.match(/<title>#(\d+):/);
  return match ? parseInt(match[1]) : null;
};

// Разбиваем на items
const items = content.split('<item>');
const header = items.shift(); // Убираем header (до первого item)

let updatedCount = 0;

console.log(`Найдено ${items.length} эпизодов`);

// Обрабатываем каждый item
const updatedItems = items.map(itemText => {
  const episodeNum = getEpisodeNumber(itemText);

  // Обрабатываем только эпизоды 100-171
  if (episodeNum === null || episodeNum < 100 || episodeNum > 171) {
    return itemText;
  }

  console.log(`Обработка эпизода #${episodeNum}...`);

  // Функция для замены boilerplate в контенте
  const replaceBoilerplate = (content) => {
    // Если есть </ul>, заменяем всё после него
    const ulIndex = content.lastIndexOf('</ul>');
    if (ulIndex !== -1) {
      return content.substring(0, ulIndex + 5) + NEW_BOILERPLATE;
    }

    // Если нет </ul>, ищем последний <p> с ссылками на подкасты
    // Паттерн: последний <p>, содержащий ссылки на директории подкастов
    const boilerplatePattern = /<p><a[^>]*>(?:наш подкаст в директории|директории подкастов)[\s\S]*?<\/p>\s*$/i;

    if (boilerplatePattern.test(content)) {
      content = content.replace(boilerplatePattern, NEW_BOILERPLATE);
      return content;
    }

    // Если не нашли паттерн, просто добавляем boilerplate в конец
    return content + NEW_BOILERPLATE;
  };

  // Обновляем description
  itemText = itemText.replace(
    /<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/,
    (match, content) => {
      updatedCount++;
      const newContent = replaceBoilerplate(content);
      return `<description>\n        <![CDATA[${newContent}]]>\n      </description>`;
    }
  );

  // Обновляем content:encoded
  itemText = itemText.replace(
    /<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content:encoded>/,
    (match, content) => {
      const newContent = replaceBoilerplate(content);
      return `<content:encoded>\n        <![CDATA[${newContent}]]>\n      </content:encoded>`;
    }
  );

  return itemText;
});

// Собираем обратно
const updatedContent = header + '<item>' + updatedItems.join('<item>');

// Создаём backup
const backupPath = FEED_PATH + '.backup';
fs.writeFileSync(backupPath, content);
console.log(`\nBackup сохранён в: ${backupPath}`);

// Сохраняем обновлённый файл
fs.writeFileSync(FEED_PATH, updatedContent);

console.log(`\n✅ Готово! Обновлено ${updatedCount} эпизодов (description + content:encoded)`);
console.log(`Всего эпизодов 100-171: ${updatedCount / 2} (по 2 тега на эпизод)`);
