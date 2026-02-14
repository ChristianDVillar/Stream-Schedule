import { jsPDF } from 'jspdf';

/**
 * Builds a single PDF with header (logo, app name, owner), table of payments and totals by currency.
 * Payment row: id, userId, username, email, licenseType, amount, currency, status, ...
 * @param {Array<{ username: string, email?: string, licenseType: string, amount: number, currency: string }>} payments
 * @param {{
 *   logoDataUrl?: string,
 *   appName?: string,
 *   ownerName?: string,
 *   ownerEmail?: string,
 *   colUsuario?: string,
 *   colTipoSuscripcion?: string,
 *   colPago?: string,
 *   colMoneda?: string,
 *   totalLabel?: string
 * }} options
 * @returns {Blob}
 */
export function buildPaymentsInvoicePdf(payments, options = {}) {
  const {
    logoDataUrl,
    appName = 'Streamer Scheduler',
    ownerName = 'Christian David Villar Colodro',
    ownerEmail = 'christiandvillar@gmail.com',
    colUsuario = 'Usuario',
    colTipoSuscripcion = 'Tipo de suscripción',
    colPago = 'Pago',
    colMoneda = 'Moneda',
    totalLabel = 'Total',
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = margin;

  // ----- Franja superior con color de marca -----
  const headerStripHeight = 28;
  doc.setFillColor(79, 70, 229);   // indigo-600
  doc.rect(0, 0, pageW, headerStripHeight, 'F');

  // ----- Logo centrado en la franja -----
  const logoHeight = 20;
  const logoWidth = 20;
  if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image') === 0) {
    try {
      const logoX = (pageW - logoWidth) / 2;
      const logoY = (headerStripHeight - logoHeight) / 2;
      const format = logoDataUrl.indexOf('image/jpeg') !== -1 ? 'JPEG' : 'PNG';
      doc.addImage(logoDataUrl, format, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      // si falla la imagen, se deja la franja sin logo
    }
  }
  y = headerStripHeight + 8;

  // ----- App name (color indigo) y datos -----
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(55, 48, 163);   // indigo-800
  doc.text(appName, margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(75, 85, 99);    // gray-600
  doc.text(ownerName, margin, y);
  y += 5;
  doc.text(ownerEmail, margin, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  // ----- Table: Usuario | Tipo de suscripción | Pago | Moneda -----
  const tableLeft = margin;
  const tableRight = pageW - margin;
  const tableWidth = tableRight - tableLeft;
  const colW = [
    tableWidth * 0.35,  // usuario
    tableWidth * 0.30,  // tipo suscripción
    tableWidth * 0.20,  // pago
    tableWidth * 0.15,  // moneda
  ];
  const rowHeight = 7;
  const headerHeight = 9;

  const x0 = tableLeft;
  const x1 = x0 + colW[0];
  const x2 = x1 + colW[1];
  const x3 = x2 + colW[2];

  // Header row (fondo indigo claro, texto indigo oscuro)
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setFillColor(224, 231, 255);   // indigo-100
  doc.rect(tableLeft, y, tableWidth, headerHeight, 'F');
  doc.setTextColor(55, 48, 163);     // indigo-800
  doc.text(colUsuario, x0 + 2, y + 6);
  doc.text(colTipoSuscripcion, x1 + 2, y + 6);
  doc.text(colPago, x2 + 2, y + 6);
  doc.text(colMoneda, x3 + 2, y + 6);
  y += headerHeight;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  const totalsByCurrency = {};

  for (let i = 0; i < payments.length; i++) {
    const row = payments[i];
    const userDisplay = row.username || row.email || '-';
    const tipo = row.licenseType || '-';
    const amount = Number(row.amount || 0);
    const currency = row.currency || '';

    if (currency) {
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
    }

    // New page if needed
    if (y + rowHeight > pageH - margin - 25) {
      doc.addPage();
      y = margin;
      doc.setFont(undefined, 'bold');
      doc.setFillColor(224, 231, 255);
      doc.rect(tableLeft, y, tableWidth, headerHeight, 'F');
      doc.setTextColor(55, 48, 163);
      doc.text(colUsuario, x0 + 2, y + 6);
      doc.text(colTipoSuscripcion, x1 + 2, y + 6);
      doc.text(colPago, x2 + 2, y + 6);
      doc.text(colMoneda, x3 + 2, y + 6);
      y += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    // Filas alternas en gris muy suave
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableLeft, y, tableWidth, rowHeight, 'F');
    }
    doc.text(String(userDisplay).substring(0, 28), x0 + 2, y + 5);
    doc.text(String(tipo).substring(0, 20), x1 + 2, y + 5);
    doc.text(amount.toFixed(2), x2 + 2, y + 5);
    doc.text(currency, x3 + 2, y + 5);
    y += rowHeight;
  }

  y += 6;

  // ----- Totals by currency (color verde/emerald) -----
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);    // emerald-600
  const currencies = Object.keys(totalsByCurrency).sort();
  for (const currency of currencies) {
    const sum = totalsByCurrency[currency];
    doc.text(`${totalLabel} ${currency}: ${sum.toFixed(2)}`, tableLeft, y);
    y += 7;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  return doc.output('blob');
}
