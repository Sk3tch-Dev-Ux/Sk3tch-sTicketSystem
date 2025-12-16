const embeds = require('./embeds');
const permissions = require('./permissions');
const transcript = require('./transcript');
const logger = require('./logger');

module.exports = {
    ...embeds,
    ...permissions,
    ...transcript,
    ...logger
};
