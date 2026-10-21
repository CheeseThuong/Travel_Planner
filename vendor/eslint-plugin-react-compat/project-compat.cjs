// Project adapter; original rule implementations are unmodified. See UPSTREAM.json.
const { fixupPluginRules } = require('@eslint/compat');
module.exports = fixupPluginRules(require('./index.js'));
