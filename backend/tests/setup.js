// Doit s'exécuter AVANT tout require() de src/prisma ou src/index
// setupFiles garantit que ce fichier tourne avant que les modules soient chargés
require('dotenv').config();
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
process.env.NODE_ENV = 'test';
