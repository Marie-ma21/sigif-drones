import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import { Mision, HistorialAsignacion } from '../models/mision.model';

export interface ResultadoAsignacion {
  ok: boolean;
  /** Mensaje tal cual lo devuelve el trigger de Postgres (RN-01) cuando bloquea */
  mensajeError?: string;
}

@Injectable({ providedIn: 'root' })
export class MisionesService {
  async listar(): Promise<Mision[]> {
    const { data, error } = await supabase
      .from('misiones')
      .select('*')
      .order('codigo_mision', { ascending: true });

    if (error) throw error;
    return (data ?? []) as Mision[];
  }

  /**
   * Intenta asignar un dron a una misión.
   * Esta es la "segunda verificación" (backend) de CP-RF08-01: si el dron
   * está en ROJO, la base de datos rechaza el INSERT con el mensaje de la
   * regla RN-01, sin importar si el botón del frontend fue o no deshabilitado.
   */
  async asignarDron(misionId: number, dronId: number): Promise<ResultadoAsignacion> {
    const { error } = await supabase
      .from('asignaciones_misiones')
      .insert({ mision_id: misionId, dron_id: dronId });

    if (error) {
      return { ok: false, mensajeError: error.message };
    }
    return { ok: true };
  }

  /**
   * Últimas asignaciones realizadas, con el código del dron y de la misión
   * ya resueltos (PostgREST "embeds" la fila relacionada por la FK).
   * Sustenta la trazabilidad (RF-13) directamente desde esta pantalla.
   */
  async listarHistorial(limite = 8): Promise<HistorialAsignacion[]> {
    const { data, error } = await supabase
      .from('asignaciones_misiones')
      .select('id, fecha_asignacion, drones(codigo), misiones(codigo_mision)')
      .order('fecha_asignacion', { ascending: false })
      .limit(limite);

    if (error) throw error;
    return (data ?? []) as unknown as HistorialAsignacion[];
  }
}
