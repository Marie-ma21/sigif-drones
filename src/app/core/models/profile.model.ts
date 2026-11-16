export type Rol = 'coordinador' | 'mantenimiento' | 'operador' | 'analista';

export interface Profile {
  id: string;
  nombre_completo: string | null;
  rol: Rol;
}