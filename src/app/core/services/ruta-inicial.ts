import { Rol } from '../models/profile.model';

/** Pantalla a la que se envía a cada usuario después de iniciar sesión. */
export function rutaInicial(rol: Rol | string | null | undefined): string {
  return String(rol ?? '').toLowerCase() === 'operador'
    ? '/misiones/mis-solicitudes'
    : '/misiones/asignacion';
}