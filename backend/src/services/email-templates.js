/**
 * Templates HTML pour les emails transactionnels.
 * Inline CSS simple, compatible mobile.
 */

const BRAND_COLOR = '#D4A843';

function layout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#2a2a2a;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 28px 0;text-align:center;">
          <span style="font-size:28px;font-weight:700;color:${BRAND_COLOR};letter-spacing:0.5px;">Cocktail App</span>
        </td></tr>
        <tr><td style="padding:24px 28px 32px;color:#e0e0e0;font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #3a3a3a;text-align:center;color:#888;font-size:12px;">
          Cocktail App &mdash; cocktail-app.fr
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(url, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr><td style="background-color:${BRAND_COLOR};border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#1a1a1a;font-weight:600;font-size:15px;text-decoration:none;">${label}</a>
    </td></tr>
  </table>`;
}

function verifyEmailTemplate({ pseudo, verifyUrl }) {
  const subject = 'Confirme ton adresse email — Cocktail App';
  const html = layout(`
    <p style="margin:0 0 16px;">Salut <strong>${pseudo}</strong>,</p>
    <p style="margin:0 0 8px;">Bienvenue sur Cocktail App ! Clique sur le bouton ci-dessous pour confirmer ton adresse email :</p>
    ${button(verifyUrl, 'Confirmer mon email')}
    <p style="margin:0 0 8px;color:#aaa;font-size:13px;">Ce lien expire dans <strong>24 heures</strong>.</p>
    <p style="margin:16px 0 0;color:#aaa;font-size:13px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :</p>
    <p style="margin:4px 0 0;word-break:break-all;font-size:13px;"><a href="${verifyUrl}" style="color:${BRAND_COLOR};">${verifyUrl}</a></p>
  `);
  return { subject, html };
}

function resetPasswordTemplate({ pseudo, resetUrl }) {
  const subject = 'Réinitialisation de ton mot de passe — Cocktail App';
  const html = layout(`
    <p style="margin:0 0 16px;">Salut <strong>${pseudo}</strong>,</p>
    <p style="margin:0 0 8px;">Tu as demandé la réinitialisation de ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau :</p>
    ${button(resetUrl, 'Réinitialiser mon mot de passe')}
    <p style="margin:0 0 8px;color:#aaa;font-size:13px;">Ce lien expire dans <strong>1 heure</strong>.</p>
    <p style="margin:0 0 8px;color:#aaa;font-size:13px;">Si tu n'as pas fait cette demande, ignore simplement cet email. Ton mot de passe restera inchangé.</p>
    <p style="margin:16px 0 0;color:#aaa;font-size:13px;">Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :</p>
    <p style="margin:4px 0 0;word-break:break-all;font-size:13px;"><a href="${resetUrl}" style="color:${BRAND_COLOR};">${resetUrl}</a></p>
  `);
  return { subject, html };
}

module.exports = { verifyEmailTemplate, resetPasswordTemplate };
