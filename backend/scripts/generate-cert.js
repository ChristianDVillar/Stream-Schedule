const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// Generate a new key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a new certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

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
  value: 'Organization'
}, {
  shortName: 'OU',
  value: 'Organizational Unit'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Set certificate extensions
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
  altNames: [{
    type: 2, // DNS
    value: 'localhost'
  }]
}]);

// Self-sign the certificate
cert.sign(keys.privateKey);

// Convert to PEM format
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certificatePem = forge.pki.certificateToPem(cert);

// Save the files
const certPath = path.join(__dirname, '..', 'ssl');
if (!fs.existsSync(certPath)) {
  fs.mkdirSync(certPath);
}

fs.writeFileSync(path.join(certPath, 'localhost.key'), privateKeyPem);
fs.writeFileSync(path.join(certPath, 'localhost.crt'), certificatePem);

console.log('SSL certificates generated successfully!'); 