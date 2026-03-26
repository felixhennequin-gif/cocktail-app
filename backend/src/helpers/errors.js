// Helpers d'erreur standardisés (#110)
// Format de réponse : { error: "message", code: "CODE" [, details: {...}] }

// Envoie une réponse d'erreur standardisée
const sendError = (res, status, message, code) => {
  return res.status(status).json({ error: message, code });
};

// Raccourcis pour les codes HTTP courants
const badRequest   = (res, message = 'Requête invalide') => sendError(res, 400, message, 'BAD_REQUEST');
const unauthorized = (res, message = 'Non autorisé')     => sendError(res, 401, message, 'UNAUTHORIZED');
const forbidden    = (res, message = 'Accès refusé')     => sendError(res, 403, message, 'FORBIDDEN');
const notFound     = (res, message = 'Ressource introuvable') => sendError(res, 404, message, 'NOT_FOUND');
const conflict     = (res, message)                      => sendError(res, 409, message, 'CONFLICT');

// Formate une erreur Zod en réponse standardisée
const validationError = (res, zodError) => {
  return res.status(400).json({
    error: 'Erreur de validation',
    code: 'VALIDATION_ERROR',
    details: zodError.flatten().fieldErrors,
  });
};

module.exports = { sendError, badRequest, unauthorized, forbidden, notFound, conflict, validationError };
