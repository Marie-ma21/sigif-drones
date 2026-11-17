import { Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase-client';
import { Profile, Rol } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Sesión actual de Supabase Auth (null = no autenticado) */
  readonly session = signal<Session | null>(null);
  /** Perfil (incluye el rol) del usuario autenticado */
  readonly profile = signal<Profile | null>(null);
  /** true mientras se resuelve la sesión inicial al recargar la página */
  readonly cargandoSesion = signal<boolean>(true);

  constructor() {
    // Restaura la sesión si ya existía (ej. al recargar la página)
    supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      if (data.session) {
        this.cargarPerfil(data.session.user.id);
      } else {
        this.cargandoSesion.set(false);
      }
    });

    // Se mantiene sincronizado ante login/logout en cualquier pestaña
    supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      if (session) {
        this.cargarPerfil(session.user.id);
      } else {
        this.profile.set(null);
        this.cargandoSesion.set(false);
      }
    });
  }

  private async cargarPerfil(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol')
      .eq('id', userId)
      .single();

    if (!error && data) {
      this.profile.set(data as Profile);
    }
    this.cargandoSesion.set(false);
  }

  // async iniciarSesion(email: string, password: string): Promise<{ error: string | null }> {
  //   const { error } = await supabase.auth.signInWithPassword({ email, password });
  //   return { error: error?.message ?? null };
  // }

    async iniciarSesion(
    email: string,
    password: string,
  ): Promise<{ error: string | null; rol?: Rol; sinPerfil?: boolean }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { error: error?.message ?? 'No fue posible iniciar sesión.' };
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol')
      .eq('id', data.user.id)
      .single();

    if (errorPerfil || !perfil) {
      await supabase.auth.signOut();
      return { error: 'Sin perfil', sinPerfil: true };
    }

    this.profile.set(perfil as Profile);
    return { error: null, rol: (perfil as Profile).rol };
  }

  async cerrarSesion(): Promise<void> {
    await supabase.auth.signOut();
    this.session.set(null);
    this.profile.set(null);
  }

  estaAutenticado(): boolean {
    return this.session() !== null;
  }
}