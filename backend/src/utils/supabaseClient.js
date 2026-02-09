/**
 * Supabase Client for Backend
 * Uses Service Role Key for admin operations
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // SUPABASE_URL or SUPABASE_SERVICE_KEY not set; upload may use frontend or be disabled
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;
