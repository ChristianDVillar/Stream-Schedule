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
 *   fixedCosts?: Array<{ label: string, amount: number, currency: string }>,
 *   fixedCostsSectionLabel?: string,
 *   revenueMinusFixedLabel?: string,
 *   resultLabel?: string,
 *   incomeTotalsSectionLabel?: string,
 *   fixedCostsTotalLabel?: string,
 *   netIncomeLabel?: string,
 *   totalIncomeHeadingLabel?: string,
 *   totalIncomeSubscriptionsLabel?: string,
 *   finalTotalSectionLabel?: string,
 *   conversionRateLabel?: string,
 *   exchangeRatesToEur?: { [currency: string]: number },  // e.g. { USD: 0.92 } => 1 USD = 0.92 EUR
 * }} options
 * @returns {Blob}
 */
const DEFAULT_FIXED_COSTS = [
  { label: 'Cursor', amount: 20, currency: 'EUR' },
  { label: 'Render', amount: 7, currency: 'EUR' },
];

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
    fixedCosts = DEFAULT_FIXED_COSTS,
    fixedCostsSectionLabel = 'Costes fijos mensuales (control)',
    revenueMinusFixedLabel = 'Ingresos (suscripciones) − Costes fijos',
    resultLabel = 'Resultado',
    incomeTotalsSectionLabel = 'Total ingresos (suscripciones)',
    fixedCostsTotalLabel = 'Total gastos fijos',
    netIncomeLabel = 'Total de ingresos (ingresos − gastos fijos)',
    totalIncomeHeadingLabel = 'Total income =',
    totalIncomeSubscriptionsLabel = 'Total income (subscriptions)',
    finalTotalSectionLabel = 'Final Total',
    conversionRateLabel = 'Conversion rate',
    exchangeRatesToEur = { USD: 0.92 }, // 1 USD = 0.92 EUR (default; override with cotización del día)
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
      const key = currency.toUpperCase();
      totalsByCurrency[key] = (totalsByCurrency[key] || 0) + amount;
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

  // ----- Total row(s) dentro de la tabla de suscripciones -----
  const currenciesSubs = Object.keys(totalsByCurrency).sort();
  doc.setDrawColor(99, 102, 241);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(55, 48, 163);
  if (currenciesSubs.length > 0) {
    currenciesSubs.forEach((currency, idx) => {
      doc.rect(tableLeft, y, tableWidth, rowHeight, 'S');
      if (idx === 0) {
        doc.text(totalIncomeSubscriptionsLabel, x0 + 2, y + 5);
      }
      doc.text(currency, x2 + (colW[2] - doc.getTextWidth(currency)) / 2, y + 5);
      const sum = totalsByCurrency[currency];
      const amountStr = sum.toFixed(2);
      doc.text(amountStr, x3 + colW[3] - doc.getTextWidth(amountStr), y + 5);
      y += rowHeight;
    });
  } else {
    doc.rect(tableLeft, y, tableWidth, rowHeight, 'S');
    doc.text(totalIncomeSubscriptionsLabel, x0 + 2, y + 5);
    doc.text('EUR', x2 + (colW[2] - doc.getTextWidth('EUR')) / 2, y + 5);
    doc.text('0.00', x3 + colW[3] - doc.getTextWidth('0.00'), y + 5);
    y += rowHeight;
  }
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ----- 2) Tabla: Fixed monthly costs (control) -----
  const fixedTotalByCurrency = {};
  if (Array.isArray(fixedCosts) && fixedCosts.length > 0) {
    for (const item of fixedCosts) {
      const c = (item.currency || 'EUR').toUpperCase();
      fixedTotalByCurrency[c] = (fixedTotalByCurrency[c] || 0) + Number(item.amount || 0);
    }
  }
  const fixedTableW = tableWidth;
  // Columnas: Concept (ancho) | Currency | Amount
  const fixedColW = [fixedTableW * 0.5, fixedTableW * 0.2, fixedTableW * 0.3];
  const fixedRowH = 7;
  const fixedHeaderH = 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(fixedCostsSectionLabel, margin, y);
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 243, 205);
  doc.rect(tableLeft, y, fixedTableW, fixedHeaderH, 'F');
  doc.setDrawColor(220, 200, 150);
  doc.rect(tableLeft, y, fixedTableW, fixedHeaderH, 'S');
  doc.setFont(undefined, 'bold');
  const fixedAmountXEnd = tableLeft + fixedColW[0] + fixedColW[1] + fixedColW[2];
  doc.text('Concept', tableLeft + 3, y + 5.5);
  doc.text('Currency', tableLeft + fixedColW[0] + 3, y + 5.5);
  doc.text('Amount', fixedAmountXEnd - doc.getTextWidth('Amount'), y + 5.5);
  y += fixedHeaderH;
  doc.setFont(undefined, 'normal');
  if (Array.isArray(fixedCosts) && fixedCosts.length > 0) {
    for (const item of fixedCosts) {
      const amtStr = Number(item.amount).toFixed(2);
      doc.rect(tableLeft, y, fixedTableW, fixedRowH, 'S');
      doc.text(item.label, tableLeft + 3, y + 5);
      doc.text((item.currency || 'EUR').toUpperCase(), tableLeft + fixedColW[0] + 3, y + 5);
      doc.text(amtStr, fixedAmountXEnd - doc.getTextWidth(amtStr), y + 5);
      y += fixedRowH;
    }
  }
  doc.setFont(undefined, 'bold');
  doc.rect(tableLeft, y, fixedTableW, fixedRowH, 'S');
  doc.text(fixedCostsTotalLabel, tableLeft + 3, y + 5);
  const currenciesFixed = Object.keys(fixedTotalByCurrency).sort();
  if (currenciesFixed.length > 0) {
    const firstC = currenciesFixed[0];
    const amtStr = fixedTotalByCurrency[firstC].toFixed(2);
    doc.text(firstC, tableLeft + fixedColW[0] + 3, y + 5);
    doc.text(amtStr, fixedAmountXEnd - doc.getTextWidth(amtStr), y + 5);
  } else {
    doc.text('EUR', tableLeft + fixedColW[0] + 3, y + 5);
    doc.text('0.00', fixedAmountXEnd - doc.getTextWidth('0.00'), y + 5);
  }
  y += fixedRowH;
  for (let i = 1; i < currenciesFixed.length; i++) {
    const c = currenciesFixed[i];
    const amtStr = fixedTotalByCurrency[c].toFixed(2);
    doc.rect(tableLeft, y, fixedTableW, fixedRowH, 'S');
    doc.text('', tableLeft + 3, y + 5);
    doc.text(c, tableLeft + fixedColW[0] + 3, y + 5);
    doc.text(amtStr, fixedAmountXEnd - doc.getTextWidth(amtStr), y + 5);
    y += fixedRowH;
  }
  doc.setFont(undefined, 'normal');
  y += 8;

  // ----- 3) Tabla: Final Total (subscriptions, fixed costs, total income) -----
  const allCurrencies = [...new Set([...Object.keys(totalsByCurrency), ...Object.keys(fixedTotalByCurrency)])].sort();
  let totalIncomeEur = 0;
  for (const c of allCurrencies) {
    const subs = totalsByCurrency[c] != null ? totalsByCurrency[c] : 0;
    const fixed = fixedTotalByCurrency[c] != null ? fixedTotalByCurrency[c] : 0;
    const incomeInCurrency = subs - fixed;
    const rate = c === 'EUR' ? 1 : (exchangeRatesToEur[c] != null ? exchangeRatesToEur[c] : 0);
    totalIncomeEur += incomeInCurrency * rate;
  }
  const ftTableW = tableWidth;
  const ftColW = [ftTableW * 0.42, ftTableW * 0.18, ftTableW * 0.15, ftTableW * 0.25];
  const ftRowH = 7;
  const ftHeaderH = 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(55, 48, 163);
  doc.text(finalTotalSectionLabel, margin, y);
  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(224, 231, 255);
  doc.rect(tableLeft, y, ftTableW, ftHeaderH, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.rect(tableLeft, y, ftTableW, ftHeaderH, 'S');
  doc.setFont(undefined, 'bold');
  const ftAmountXEnd = tableLeft + ftColW[0] + ftColW[1] + ftColW[2] + ftColW[3];
  doc.text('Item', tableLeft + 3, y + 5.5);
  doc.text(conversionRateLabel, tableLeft + ftColW[0] + 3, y + 5.5);
  doc.text('Currency', tableLeft + ftColW[0] + ftColW[1] + 3, y + 5.5);
  doc.text('Amount', ftAmountXEnd - doc.getTextWidth('Amount'), y + 5.5);
  y += ftHeaderH;
  doc.setFont(undefined, 'normal');
  // Fila 1: Total income (subscriptions)
  doc.rect(tableLeft, y, ftTableW, ftRowH, 'S');
  doc.text(totalIncomeSubscriptionsLabel, tableLeft + 3, y + 5);
  const subsCurrencies = Object.keys(totalsByCurrency).sort();
  if (subsCurrencies.length > 0) {
    const sc = subsCurrencies[0];
    const rateStr = sc === 'EUR' ? '—' : (exchangeRatesToEur[sc] != null ? String(exchangeRatesToEur[sc]) : '—');
    const amtStr = totalsByCurrency[sc].toFixed(2);
    doc.text(rateStr, tableLeft + ftColW[0] + 3, y + 5);
    doc.text(sc, tableLeft + ftColW[0] + ftColW[1] + 3, y + 5);
    doc.text(amtStr, ftAmountXEnd - doc.getTextWidth(amtStr), y + 5);
  } else {
    doc.text('—', tableLeft + ftColW[0] + 3, y + 5);
    doc.text('EUR', tableLeft + ftColW[0] + ftColW[1] + 3, y + 5);
    doc.text('0.00', ftAmountXEnd - doc.getTextWidth('0.00'), y + 5);
  }
  y += ftRowH;
  // Fila 2: Total fixed costs
  doc.rect(tableLeft, y, ftTableW, ftRowH, 'S');
  doc.text(fixedCostsTotalLabel, tableLeft + 3, y + 5);
  doc.text('—', tableLeft + ftColW[0] + 3, y + 5);
  const fixedCurrencies = Object.keys(fixedTotalByCurrency).sort();
  if (fixedCurrencies.length > 0) {
    const fc = fixedCurrencies[0];
    const amtStr = fixedTotalByCurrency[fc].toFixed(2);
    doc.text(fc, tableLeft + ftColW[0] + ftColW[1] + 3, y + 5);
    doc.text(amtStr, ftAmountXEnd - doc.getTextWidth(amtStr), y + 5);
  } else {
    doc.text('EUR', tableLeft + ftColW[0] + ftColW[1] + 3, y + 5);
    doc.text('0.00', ftAmountXEnd - doc.getTextWidth('0.00'), y + 5);
  }
  y += ftRowH;
  // Fila 3: Total income (net)
  doc.setFont(undefined, 'bold');
  doc.setTextColor(5, 150, 105);
  const netAmountStr = totalIncomeEur.toFixed(2);
  doc.rect(tableLeft, y, ftTableW, ftRowH, 'S');
  doc.text(netIncomeLabel, tableLeft + 3, y + 5);
  doc.text('—', tableLeft + ftColW[0] + 3, y + 5);
  doc.text('EUR', tableLeft + ftColW[0] + ftColW[1] + 3, y + 5);
  doc.text(netAmountStr, ftAmountXEnd - doc.getTextWidth(netAmountStr), y + 5);
  y += ftRowH + 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  // ----- Bloque para gestoría (España): base, IVA, forma de pago -----
  if (y > pageH - margin - 50) {
    doc.addPage();
    y = margin;
  }
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
