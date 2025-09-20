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
    // Support RFC 2822 with numeric TZ (e.g. "+0000"), UTC/GMT suffixes, and ISO variants
    const formats = [
        "ddd, D MMM YYYY HH:mm:ss ZZ",
        "ddd, D MMM YYYY HH:mm ZZ",
        "ddd, D MMM YYYY HH:mm:ss [UTC]",
        "ddd, D MMM YYYY HH:mm [UTC]",
        "ddd, D MMM YYYY HH:mm:ss [GMT]",
        "ddd, D MMM YYYY HH:mm [GMT]",
        "YYYY-MM-DDTHH:mm:ss.SSSZ",
        "YYYY-MM-DDTHH:mm:ssZ"
    ];

    // Try parsing with the known formats
    let parsedDate;
    for (const format of formats) {
        parsedDate = dayjs(dateString, format, true);
        if (parsedDate.isValid()) break;
        // Also try forcing UTC interpretation where appropriate
        parsedDate = dayjs.utc(dateString, format, true);
        if (parsedDate.isValid()) break;
    }

    // Fallback: rely on native Date parsing for common RFC 2822/ISO strings
    if (!parsedDate || !parsedDate.isValid()) {
        const nativeDate = new Date(dateString);
        if (!isNaN(nativeDate.getTime())) {
            parsedDate = dayjs(nativeDate);
        }
    }

    return parsedDate && parsedDate.isValid() ? parsedDate.locale('ru').format('D MMMM YYYY') : 'Дата не указана';
}

module.exports = {
    parseFlexibleDate
};