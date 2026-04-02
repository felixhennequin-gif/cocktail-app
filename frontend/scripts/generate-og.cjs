const sharp = require('sharp');
const path = require('path');

const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f1419"/>
      <stop offset="100%" stop-color="#1a2332"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#B8941F"/>
      <stop offset="50%" stop-color="#D4A843"/>
      <stop offset="100%" stop-color="#B8941F"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <line x1="400" y1="290" x2="800" y2="290" stroke="url(#gold)" stroke-width="1" opacity="0.5"/>
  <text x="600" y="340" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="#D4A843" font-weight="bold">Écume</text>
  <line x1="400" y1="370" x2="800" y2="370" stroke="url(#gold)" stroke-width="1" opacity="0.5"/>
  <text x="600" y="420" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="#8899aa" letter-spacing="4">Recettes &amp; Inspiration Cocktails</text>
  <text x="600" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#D4A843" opacity="0.3">&#10022;</text>
  <text x="560" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#D4A843" opacity="0.2">&#10022;</text>
  <text x="640" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#D4A843" opacity="0.2">&#10022;</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'public', 'og-default.png'))
  .then(() => console.log('og-default.png generated successfully'))
  .catch(console.error);
