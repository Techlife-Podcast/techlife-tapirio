// scripts/utils/convert-date.js

const dayjs = require("dayjs");
const utc = require('dayjs/plugin/utc');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const localeData = require('dayjs/plugin/localeData');
require('dayjs/locale/ru');

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(localeData);

function parseFlexibleDate(dateString) {
    const formats = ["ddd, D MMM YYYY HH:mm:ss [UTC]", "ddd, D MMM YYYY HH:mm [UTC]", "YYYY-MM-DDTHH:mm:ss.SSS[Z]"];

    // Try parsing with custom formats
    let parsedDate;
    for (const format of formats) {
        parsedDate = dayjs(dateString, format, true);
        if (parsedDate.isValid()) break;
    }

    if (!parsedDate || !parsedDate.isValid()) {
        const regex = /(\w{3}), (\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})(?::(\d{2}))? UTC/;
        const match = dateString.match(regex);
        if (match) {
            const [, , day, monthStr, year, hours, minutes, seconds] = match;
            // Get month index using a temporary dayjs instance
            const monthIndex = dayjs(`01 ${monthStr} 2000`, 'DD MMM YYYY').month();
            parsedDate = dayjs.utc(`${year}-${monthIndex + 1}-${day} ${hours}:${minutes}:${seconds || 0}`);
        }
    }

    return parsedDate && parsedDate.isValid() ? parsedDate.locale('ru').format('D MMMM YYYY') : 'Дата не указана';
}

module.exports = {
    parseFlexibleDate
};