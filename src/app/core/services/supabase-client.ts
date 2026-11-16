import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase.config';

/**
 * Un único cliente de Supabase para toda la app (patrón recomendado por
 * Supabase: NO crear un createClient() por servicio).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);