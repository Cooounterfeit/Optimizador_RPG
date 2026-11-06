import { supabase } from '../../lib/supabase';

import { setAuthService } from './auth-service';
import { createSupabaseAuthService } from './supabase-auth-service';

/** Servicio por defecto: con variables apunta a Supabase; sin ellas queda nulo. */
export const defaultAuthService = supabase ? createSupabaseAuthService(supabase) : null;

setAuthService(defaultAuthService);
