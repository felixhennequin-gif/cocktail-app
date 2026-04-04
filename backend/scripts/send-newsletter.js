#!/usr/bin/env node
// Script CRON hebdomadaire pour envoyer la newsletter
// Usage: node scripts/send-newsletter.js
// Planifier avec cron: 0 9 * * 1 cd /path/to/backend && node scripts/send-newsletter.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const crypto = require('crypto');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const baseUrl = process.env.BASE_URL || 'https://cocktail-app.fr';

  // Récupérer les abonnés actifs
  const subscribers = await prisma.newsletterSubscription.findMany({
    where: { active: true },
    include: { user: { select: { pseudo: true } } },
  });

  if (subscribers.length === 0) {
    console.log('Aucun abonné actif');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`${subscribers.length} abonnés actifs`);

  // Contenu de la newsletter
  const today = new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha256').update(today).digest();

  // Cocktail du jour
  const recipeCount = await prisma.recipe.count({ where: { status: 'PUBLISHED' } });
  const dailyIndex = hash.readUInt32BE(0) % recipeCount;
  const [dailyRecipe] = await prisma.recipe.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { id: 'asc' },
    skip: dailyIndex,
    take: 1,
    select: { id: true, name: true, description: true },
  });

  // Top 3 nouvelles recettes de la semaine
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newRecipes = await prisma.recipe.findMany({
    where: { status: 'PUBLISHED', createdAt: { gte: oneWeekAgo } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, name: true, description: true },
  });

  // Défi en cours
  const currentChallenge = await prisma.challenge.findFirst({
    where: { active: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    select: { id: true, title: true, description: true },
  });

  // Stats communauté
  const [usersCount, recipesTotal] = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count({ where: { status: 'PUBLISHED' } }),
  ]);

  // Générer le HTML de la newsletter
  for (const sub of subscribers) {
    const _html = generateHtml({
      pseudo: sub.user.pseudo,
      dailyRecipe,
      newRecipes,
      currentChallenge,
      usersCount,
      recipesTotal,
      baseUrl,
      unsubscribeUrl: `${baseUrl}/api/newsletter/unsubscribe/${sub.unsubscribeToken}`,
    });

    // NOTE: L'envoi réel nécessite nodemailer + SMTP configuré
    // Pour l'instant on log le contenu
    console.log(`📧 Newsletter pour ${sub.email} (${sub.user.pseudo}) — générée`);
    // await sendEmail(sub.email, `Cocktails de la semaine — ${today}`, html);
  }

  console.log(`\n✅ Newsletter générée pour ${subscribers.length} abonnés`);
  await prisma.$disconnect();
  await pool.end();
}

function generateHtml({ pseudo, dailyRecipe, newRecipes, currentChallenge, usersCount, recipesTotal, baseUrl, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:#1a1a2e;color:#d4a047;text-align:center;padding:30px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:24px">🍸 Écume</h1>
      <p style="margin:8px 0 0;color:#aaa;font-size:14px">Bonjour ${pseudo} !</p>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px">
      ${dailyRecipe ? `
        <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 8px">🍹 Cocktail du jour</h2>
        <p style="margin:0 0 16px;color:#666"><a href="${baseUrl}/recipes/${dailyRecipe.id}" style="color:#d4a047;font-weight:600">${dailyRecipe.name}</a> — ${(dailyRecipe.description || '').substring(0, 100)}</p>
      ` : ''}
      ${newRecipes.length > 0 ? `
        <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 8px">✨ Nouvelles recettes</h2>
        <ul style="padding-left:20px;color:#666;margin:0 0 16px">
          ${newRecipes.map((r) => `<li><a href="${baseUrl}/recipes/${r.id}" style="color:#d4a047">${r.name}</a></li>`).join('')}
        </ul>
      ` : ''}
      ${currentChallenge ? `
        <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 8px">🏆 Défi en cours</h2>
        <p style="margin:0 0 16px;color:#666"><a href="${baseUrl}/challenges/${currentChallenge.id}" style="color:#d4a047">${currentChallenge.title}</a></p>
      ` : ''}
      <p style="color:#999;font-size:12px;text-align:center;margin:20px 0 0;border-top:1px solid #eee;padding-top:15px">
        ${usersCount} membres · ${recipesTotal} recettes<br>
        <a href="${unsubscribeUrl}" style="color:#999">Se désinscrire</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

main().catch(console.error);
