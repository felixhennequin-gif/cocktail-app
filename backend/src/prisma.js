const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Validation de la connexion BDD au démarrage
if (!process.env.DATABASE_URL) {
  throw new Error('La variable d\'environnement DATABASE_URL est requise');
}

// Connexion PostgreSQL via adaptateur Prisma 7
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max:                    parseInt(process.env.PG_POOL_MAX || '20'),
  idleTimeoutMillis:      30_000,
  connectionTimeoutMillis: 5_000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
