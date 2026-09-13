require('dotenv').config();
const app = require('./app');
const { verifyConnection } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

(async () => {
  await verifyConnection();
  app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
})();
