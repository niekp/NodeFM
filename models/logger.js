let logger;

function getLogger() {
    if (!logger) {
        var dateFormat = require('dateformat');
        const { createLogger, format, transports } = require('winston');
        const { combine, timestamp, printf } = format;

        const myFormat = printf(({ level, message, exception, timestamp }) => {
            return `${dateFormat(timestamp, 'dd-mm HH:MM')} ${level}: ${message} ${exception ? ' - ' + exception : ''}`;
        });

        logger = createLogger({
            level: 'info',
            format: combine(
                timestamp(),
                myFormat,
            ),
            transports: [
                new transports.File({
                    filename: './logs/error.log',
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                }),
                new transports.File({
                    filename: './logs/warn.log',
                    level: 'warn',
                    maxsize: 5242880, // 5MB
                }),
                new transports.File({
                    filename: './logs/combined.log',
                    maxsize: 5242880, // 5MB
                }),
            ]
        });

        if (process.env.NODE_ENV !== 'production') {
            logger.add(new transports.Console({
                format: combine(
                    format.colorize(),
                    timestamp(),
                    myFormat,
                ),
            }));
        }
    }

    return logger;
}

module.exports = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',

    log: function(level, message, exception) {
        if (typeof (message) == 'object') {
            message = JSON.stringify(message);
        }

        let line = {
            level: level,
            message: message,
        }

        if (typeof (exception) == 'object') {
            line.exception = JSON.stringify({ message: exception.message, stack: exception.stack })
        } else if (exception) {
            line.exception = exception;
        }
        
        getLogger().log(line);
    }
}
