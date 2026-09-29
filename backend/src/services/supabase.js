import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates and initializes Supabase clients.
 * Throws an error if required environment variables are missing.
 *
 * @param {object} [env=process.env] - Environment variables object.
 * @returns {{ supabase: import('@supabase/supabase-js').SupabaseClient, supabaseAnon: import('@supabase/supabase-js').SupabaseClient|null }}
 */
export function initSupabaseClients(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  /**
   * Singleton Supabase client with administrative privileges (service role).
   * Strictly for backend server contexts. Do NOT expose to frontend.
   * @type {import('@supabase/supabase-js').SupabaseClient}
   */
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  /**
   * Singleton Supabase client initialized with anon public key.
   * For future use in contexts with row level security or anonymous requests.
   * @type {import('@supabase/supabase-js').SupabaseClient|null}
   */
  const supabaseAnon = anonKey
    ? createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false
        }
      })
    : null;

  return { supabase, supabaseAnon };
}

let supabaseInstance = null;
let supabaseAnonInstance = null;

// Lazy export or immediate initialization when env variables are present
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const clients = initSupabaseClients();
  supabaseInstance = clients.supabase;
  supabaseAnonInstance = clients.supabaseAnon;
}

export { supabaseInstance as supabase, supabaseAnonInstance as supabaseAnon };
