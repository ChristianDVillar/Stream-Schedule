/**
 * Admin: USD/EUR exchange rate for PDF invoices.
 * Tries Brave Search (cotización dólar euro) then falls back to a free API.
 */

import express from 'express';
import axios from 'axios';
import { requireAdmin } from '../../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

const BRAVE_URL = 'https://search.brave.com/search?q=cotizacion+dolar+euro';
const FALLBACK_API = 'https://open.er-api.com/v6/latest/USD';

/**
 * Parse HTML/text for "1.0 US Dollar equals" ... "X.XX Euro" (rate 1 USD = X EUR).
 * Accepts both "0,85" and "0.85" format.
 */
function parseBraveUsdToEur(html) {
  const match = html.match(/1\.0\s+US Dollar equals\s*[\s\S]*?(\d+[,.]\d+)\s*Euro/i);
  if (!match) return null;
  const str = match[1].replace(',', '.');
  const rate = parseFloat(str);
  if (Number.isFinite(rate) && rate > 0.1 && rate < 2) return rate;
  return null;
}

/**
 * GET /api/admin/exchange-rate-usd-eur
 * Returns { rate: number, source: 'brave' | 'api' }.
 */
export async function exchangeRateUsdEurHandler(req, res) {
  try {
    const response = await axios.get(BRAVE_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es,en;q=0.9',
      },
      maxRedirects: 3,
      validateStatus: (s) => s === 200,
    });
    const rate = parseBraveUsdToEur(response.data);
    if (rate != null) {
      const rounded = Math.round(rate * 100) / 100;
      return res.json({ rate: rounded, source: 'brave' });
    }
  } catch (err) {
    logger.warn('Brave Search USD/EUR fetch failed', { message: err.message });
  }

  try {
    const response = await axios.get(FALLBACK_API, { timeout: 8000 });
    const eur = response.data?.rates?.EUR;
    if (Number.isFinite(eur) && eur > 0) {
      const rounded = Math.round(eur * 100) / 100;
      return res.json({ rate: rounded, source: 'api' });
    }
  } catch (err) {
    logger.warn('Fallback USD/EUR API failed', { message: err.message });
  }

  res.status(503).json({
    error: 'Could not fetch USD/EUR rate',
    details: 'Brave Search and fallback API failed. Use a manual value.',
  });
}

router.get('/exchange-rate-usd-eur', requireAdmin, exchangeRateUsdEurHandler);

export default router;
