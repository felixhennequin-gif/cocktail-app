const { badRequest, unauthorized, forbidden, notFound, conflict, validationError } = require('../src/helpers/errors');

// Mock de l'objet response Express
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Error Helpers', () => {
  it('badRequest retourne 400', () => {
    const res = mockRes();
    badRequest(res, 'Données invalides');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Données invalides', code: 'BAD_REQUEST' });
  });

  it('unauthorized retourne 401', () => {
    const res = mockRes();
    unauthorized(res, 'Non connecté');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Non connecté', code: 'UNAUTHORIZED' });
  });

  it('forbidden retourne 403', () => {
    const res = mockRes();
    forbidden(res, 'Accès interdit');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit', code: 'FORBIDDEN' });
  });

  it('notFound retourne 404', () => {
    const res = mockRes();
    notFound(res, 'Introuvable');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Introuvable', code: 'NOT_FOUND' });
  });

  it('conflict retourne 409', () => {
    const res = mockRes();
    conflict(res, 'Déjà existant');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Déjà existant', code: 'CONFLICT' });
  });

  it('validationError retourne 400 avec détails Zod', () => {
    const res = mockRes();
    const zodError = {
      flatten: () => ({
        fieldErrors: { email: ['Email invalide'], password: ['Trop court'] },
      }),
    };
    validationError(res, zodError);
    expect(res.status).toHaveBeenCalledWith(400);
    const call = res.json.mock.calls[0][0];
    expect(call.code).toBe('VALIDATION_ERROR');
    expect(call.error).toBeTruthy();
  });
});
