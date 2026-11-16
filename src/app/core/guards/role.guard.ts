import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from '../services/supabase-client';
import { Rol } from '../models/profile.model';

/**
 * Guard de ruta basado en rol.
 *
 * Esta es la verificación del lado del Angular (UX: no dejar ni entrar a
 * la pantalla si el rol no corresponde). La verificación "de verdad" sigue
 * siendo la Row Level Security en Supabase — este guard NUNCA reemplaza
 * a RLS, solo evita que alguien sin el rol vea una pantalla que no podría
 * usar de todas formas.
 */
export function roleGuard(rolesPermitidos: Rol[]): CanActivateFn {
  return async () => {
    const router = inject(Router);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session) {
      return router.createUrlTree(['/login']);
    }

    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (error || !perfil || !rolesPermitidos.includes(perfil.rol as Rol)) {
      return router.createUrlTree(['/login']);
    }

    return true;
  };
}