const logger = require('../logger');

let resendClient = null;

if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  logger.info('email', 'Service email initialisé avec Resend');
} else {
  logger.warn('email', 'RESEND_API_KEY non définie — les emails ne seront pas envoyés');
}

/**
 * Envoie un email via Resend.
 * Ne throw jamais — retourne { success, data?, error? }.
 */
async function sendEmail({ to, subject, html }) {
  if (!resendClient) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error('email', 'Erreur envoi email', { to, subject, error });
      return { success: false, error };
    }

    logger.info('email', 'Email envoyé', { to, subject, id: data?.id });
    return { success: true, data };
  } catch (error) {
    logger.error('email', 'Erreur inattendue envoi email', { to, subject, error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
