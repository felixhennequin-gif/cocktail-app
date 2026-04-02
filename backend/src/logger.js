// Logger structuré minimal — sorties JSON en production, texte lisible en développement
const isProd = process.env.NODE_ENV === 'production';

const formatMessage = (level, context, message, data) => {
  if (isProd) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...data,
    });
  }
  const prefix = `[${context}]`;
  const dataStr = data && Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
  return `${prefix} ${message}${dataStr}`;
};

const logger = {
  info:  (context, message, data = {}) => console.log(formatMessage('info', context, message, data)),
  warn:  (context, message, data = {}) => console.warn(formatMessage('warn', context, message, data)),
  error: (context, message, data = {}) => console.error(formatMessage('error', context, message, data)),
};

module.exports = logger;
