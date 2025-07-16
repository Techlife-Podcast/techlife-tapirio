// scripts/utils/convert-date.js

const moment = require("moment");
require("moment/locale/ru");

function parseFlexibleDate(dateString) {
    const formats = ["ddd, D MMM YYYY HH:mm:ss [UTC]", "ddd, D MMM YYYY HH:mm [UTC]", "YYYY-MM-DDTHH:mm:ss.SSSZ"];
    let parsedDate = moment(dateString, formats, 'en', true);

    if (!parsedDate.isValid()) {
        const regex = /(\w{3}), (\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})(?::(\d{2}))? UTC/;
        const match = dateString.match(regex);
        if (match) {
            const [, , day, monthStr, year, hours, minutes, seconds] = match;
            const month = moment().month(monthStr).format('M') - 1;
            parsedDate = moment.utc([year, month, day, hours, minutes, seconds || 0]);
        }
    }

    return parsedDate.isValid() ? parsedDate.locale('ru').format('D MMMM YYYY') : 'Дата не указана';
}

module.exports = {
    parseFlexibleDate
};