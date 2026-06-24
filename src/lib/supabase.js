import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://flwrkxufkknrqbdlkvvp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DfAuK1SeqoO3ezIgdotLzg_mff0e7lB';

// Cliente principal para consultas y autenticación del administrador
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente secundario especial para registrar delegados sin cerrar la sesión activa del administrador
export const supabaseSignUpClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
