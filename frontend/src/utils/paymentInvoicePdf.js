import { jsPDF } from 'jspdf';

/**
 * Builds a single PDF for subscription revenue: header (logo, issuer data), table of payments, totals.
 * Optional placeholders for sensitive data until configured with the gestoría.
 * @param {Array<{ username: string, email?: string, licenseType: string, amount: number, currency: string }>} payments
 * @param {{
 *   logoDataUrl?: string,
 *   appName?: string,
 *   ownerName?: string,
 *   ownerEmail?: string,
 *   usePlaceholders?: boolean,
 *   colUsuario?: string,
 *   colTipoSuscripcion?: string,
 *   colPago?: string,
 *   colMoneda?: string,
 *   totalLabel?: string,
 *   placeholderName?: string,
 *   placeholderEmail?: string,
 *   placeholderNif?: string,
 *   placeholderAddress?: string,
 *   placeholderPeriod?: string,
 *   placeholderPaymentMethod?: string,
 *   placeholderBase?: string,
 *   placeholderVat?: string,
 *   placeholderSubscriber?: string,
 *   titleLabel?: string,
 *   accountingSectionLabel?: string,
 *   noteText?: string,
 * }} options
 * @returns {Blob}
 */
export function buildPaymentsInvoicePdf(payments, options = {}) {
  const {
    logoDataUrl,
    appName = 'Streamer Scheduler',
    ownerName = 'Christian David Villar Colodro',
    ownerEmail = 'christiandvillar@gmail.com',
    usePlaceholders = true,
    colUsuario = 'Usuario',
    colTipoSuscripcion = 'Tipo de suscripción',
    colPago = 'Pago',
    colMoneda = 'Moneda',
    totalLabel = 'Total',
    placeholderName = '[Nombre o Razón Social]',
    placeholderEmail = '[Email de contacto]',
    placeholderNif = '[NIF/CIF]',
    placeholderAddress = '[Domicilio fiscal]',
    placeholderPeriod = '[Período: DD/MM/AAAA - DD/MM/AAAA]',
    placeholderPaymentMethod = '[Forma de pago: transferencia / tarjeta]',
    placeholderBase = '[Base imponible]',
    placeholderVat = '[IVA aplicable - consultar con gestoría]',
    placeholderSubscriber = '[Suscriptor]',
    titleLabel = 'Resumen de ingresos por suscripciones',
    accountingSectionLabel = 'Datos para gestoría (España)',
    noteText = 'Documento generado a partir de suscripciones. Completar con la gestoría: NIF/CIF, domicilio, período, IVA si aplica.',
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = margin;

  // ----- Franja superior con color de marca -----
  const headerStripHeight = 28;
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageW, headerStripHeight, 'F');

  if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image') === 0) {
    try {
      const logoX = (pageW - 20) / 2;
      const format = logoDataUrl.indexOf('image/jpeg') !== -1 ? 'JPEG' : 'PNG';
      doc.addImage(logoDataUrl, format, logoX, 4, 20, 20);
    } catch (e) {}
  }
  y = headerStripHeight + 6;

  // ----- Título: documento para gestoría -----
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(55, 48, 163);
  doc.text(titleLabel, margin, y);
  y += 8;

  // ----- Datos del emisor (placeholders o reales) -----
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(75, 85, 99);
  const name = usePlaceholders ? placeholderName : ownerName;
  const email = usePlaceholders ? placeholderEmail : ownerEmail;
  doc.text(name, margin, y);
  y += 5;
  doc.text(email, margin, y);
  y += 5;
  doc.text(placeholderNif, margin, y);
  y += 5;
  doc.text(placeholderAddress, margin, y);
  y += 6;
  doc.text(placeholderPeriod, margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  // ----- Table: Usuario | Tipo de suscripción | Moneda | Pago -----
  const tableLeft = margin;
  const tableRight = pageW - margin;
  const tableWidth = tableRight - tableLeft;
  const colW = [
    tableWidth * 0.35,
    tableWidth * 0.30,
    tableWidth * 0.15,
    tableWidth * 0.20,
  ];
  const rowHeight = 7;
  const headerHeight = 9;
  const x0 = tableLeft;
  const x1 = x0 + colW[0];
  const x2 = x1 + colW[1];
  const x3 = x2 + colW[2];

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setFillColor(224, 231, 255);
  doc.rect(tableLeft, y, tableWidth, headerHeight, 'F');
  doc.setTextColor(55, 48, 163);
  doc.text(colUsuario, x0 + 2, y + 6);
  doc.text(colTipoSuscripcion, x1 + 2, y + 6);
  doc.text(colMoneda, x2 + 2, y + 6);
  doc.text(colPago, x3 + 2, y + 6);
  y += headerHeight;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  const totalsByCurrency = {};

  for (let i = 0; i < payments.length; i++) {
    const row = payments[i];
    const userDisplay = usePlaceholders ? placeholderSubscriber : (row.username || row.email || '-');
    const tipo = row.licenseType || '-';
    const amount = Number(row.amount || 0);
    const currency = row.currency || '';

    if (currency) {
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + amount;
    }

    if (y + rowHeight > pageH - margin - 35) {
      doc.addPage();
      y = margin;
      doc.setFont(undefined, 'bold');
      doc.setFillColor(224, 231, 255);
      doc.rect(tableLeft, y, tableWidth, headerHeight, 'F');
      doc.setTextColor(55, 48, 163);
      doc.text(colUsuario, x0 + 2, y + 6);
      doc.text(colTipoSuscripcion, x1 + 2, y + 6);
      doc.text(colMoneda, x2 + 2, y + 6);
      doc.text(colPago, x3 + 2, y + 6);
      y += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableLeft, y, tableWidth, rowHeight, 'F');
    }
    doc.text(String(userDisplay).substring(0, 28), x0 + 2, y + 5);
    doc.text(String(tipo).substring(0, 20).toUpperCase(), x1 + 2, y + 5);
    const currencyW = doc.getTextWidth(currency);
    doc.text(currency, x2 + (colW[2] - currencyW) / 2, y + 5);
    const amountStr = amount.toFixed(2);
    doc.text(amountStr, x3 + colW[3] - doc.getTextWidth(amountStr), y + 5);
    y += rowHeight;
  }

  y += 6;

  // ----- Totales por moneda (derecha) -----
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  const currencies = Object.keys(totalsByCurrency).sort();
  for (const currency of currencies) {
    const sum = totalsByCurrency[currency];
    const totalStr = `${totalLabel} ${currency}: ${sum.toFixed(2)}`;
    doc.text(totalStr, tableRight - doc.getTextWidth(totalStr), y);
    y += 7;
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  y += 6;

  // ----- Bloque para gestoría (España): base, IVA, forma de pago -----
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(accountingSectionLabel, margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');
  doc.text(placeholderBase, margin, y);
  y += 5;
  doc.text(placeholderVat, margin, y);
  y += 5;
  doc.text(placeholderPaymentMethod, margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  try {
    const noteLines = doc.splitTextToSize(noteText, pageW - 2 * margin);
    doc.text(noteLines, margin, y);
  } catch (e) {
    doc.text(noteText.substring(0, 80) + '...', margin, y);
  }
  doc.setTextColor(0, 0, 0);

  return doc.output('blob');
}
