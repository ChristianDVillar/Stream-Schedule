export default function checkLicense(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.isAdmin) {
    return next();
  }

  if (!req.user.licenseKey || req.user.licenseKey.length < 10) {
    return res.status(403).json({ error: 'Invalid or missing license' });
  }

  if (req.user.licenseExpiresAt) {
    const expiresAt = new Date(req.user.licenseExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      return res.status(403).json({ error: 'License expired' });
    }
  }

  next();
}