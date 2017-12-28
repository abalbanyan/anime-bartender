const settings = {};

const env = process.env;

settings.malID = env.MAL_ID.trim();
settings.malPass = env.MAL_PASS.trim();
settings.mongoUrl = env.MONGO_URL.trim();
settings.helpText = env.HELP_TEXT.trim();
settings.botToken = env.BOT_TOKEN.trim();

module.exports = settings;