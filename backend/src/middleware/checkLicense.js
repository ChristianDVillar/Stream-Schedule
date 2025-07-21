export default function checkLicense(req, res, next) {
  // Example: req.user should be set by authentication middleware
  if (!req.user || !req.user.licenseKey || req.user.licenseKey.length < 10) {
    return res.status(403).json({ error: 'Invalid or missing license' });
  }
  next();
} 