export function attachMockAuthContext(req, _res, next) {
  req.auth = null;
  next();
}