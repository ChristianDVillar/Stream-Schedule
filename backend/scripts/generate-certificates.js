const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certificatesDir = path.join(__dirname, '../certificates');

// Create certificates directory if it doesn't exist
if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir, { recursive: true });
}

// Generate a new key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a new certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Add Subject Alternative Names (SANs)
const altNames = [{
  type: 2, // DNS
  value: 'localhost'
}, {
  type: 7, // IP
  ip: '127.0.0.1'
}];

const attrs = [{
  name: 'commonName',
  value: 'localhost'
}, {
  name: 'countryName',
  value: 'US'
}, {
  shortName: 'ST',
  value: 'State'
}, {
  name: 'localityName',
  value: 'City'
}, {
  name: 'organizationName',
  value: 'Development'
}, {
  shortName: 'OU',
  value: 'Development'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Set extensions
cert.setExtensions([{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'subjectAltName',
  altNames: altNames
}]);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

// Save the files
fs.writeFileSync(path.join(certificatesDir, 'localhost.key'), privateKeyPem);
fs.writeFileSync(path.join(certificatesDir, 'localhost.crt'), certPem);

console.log('SSL certificates generated successfully!'); 