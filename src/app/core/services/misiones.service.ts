import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import {
  Mision,
  HistorialAsignacion,
  EstadoAprobacion,
  SolicitudVueloPayload,
} from '../models/mision.model';

export interface ResultadoAsignacion {
  ok: boolean;
  mensajeError?: string;
}

@Injectable({ providedIn: 'root' })
export class MisionesService {
  private historialSimulado: HistorialAsignacion[] = [];
  private consecutivoMision = 91;

  // ───────────────────────── Datos reales (Supabase) ─────────────────────────

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

  // ─────────────── Flujo de aprobación simulado (en memoria) ───────────────
  // Nada de esto se guarda en la base de datos. Se conserva tal cual estaba.

  async crearSolicitudCompleta(
    payload: SolicitudVueloPayload
  ): Promise<{ ok: boolean; requiereAprobacion: boolean; codigoMision: string }> {
    const esAltaTension =
      payload.zonaCritica ||
      payload.tipoTarea === 'Inspección de torres eléctricas' ||
      payload.titulo.toLowerCase().includes('220 kv') ||
      payload.titulo.toLowerCase().includes('alta tensión');

    const estadoInicial: EstadoAprobacion = esAltaTension
      ? 'PENDIENTE_APROBACION'
      : 'APROBADA';

    const codigoMision = `MIS-2026-0${this.consecutivoMision++}`;

    const { data: dron } = await supabase
      .from('drones')
      .select('id, codigo, modelo')
      .eq('id', payload.dronId)
      .single();

    this.historialSimulado.unshift({
      id: Date.now(),
      fecha_asignacion: new Date().toISOString(),
      estado_aprobacion: estadoInicial,
      token_aprobacion: esAltaTension
        ? null
        : `AUTO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      detalle_tecnico: payload,
      drones: dron ?? { id: payload.dronId, codigo: 'DRON-04', modelo: 'UAV' },
      misiones: {
        id: Date.now(),
        codigo_mision: codigoMision,
        nombre: payload.titulo,
        nivel_riesgo: esAltaTension ? 'ALTO' : 'NORMAL',
        etiqueta_zona: esAltaTension ? 'Zona de Alta Tensión' : null,
      },
    });

    return { ok: true, requiereAprobacion: esAltaTension, codigoMision };
  }

  async aprobarDigitalmente(
    asignacionId: number,
    _coordinadorId: string | null,
    firmaPin: string
  ): Promise<{ ok: boolean; token?: string; mensajeError?: string }> {
    if (!firmaPin || firmaPin.trim().length < 4) {
      return { ok: false, mensajeError: 'Ingrese un PIN / Firma digital de al menos 4 dígitos.' };
    }

    const token = `SIGIF-HV-${Date.now().toString(36).toUpperCase()}`;
    const item = this.historialSimulado.find((h) => h.id === asignacionId);
    if (item) {
      item.estado_aprobacion = 'APROBADA';
      item.token_aprobacion = token;
      item.fecha_aprobacion = new Date().toISOString();
    }

    return { ok: true, token };
  }

  async ejecutarVueloGcs(
    asignacion: HistorialAsignacion
  ): Promise<{ ok: boolean; mensaje: string }> {
    if (asignacion.estado_aprobacion !== 'APROBADA' || !asignacion.token_aprobacion) {
      console.warn('[AUDITORÍA SEGURIDAD RF-03] Bloqueo de ejecución sin firma:', asignacion);
      return {
        ok: false,
        mensaje:
          'BLOQUEO DE SEGURIDAD (RF-03): La misión no puede enviarse a la GCS sin el token de aprobación digital del Coordinador de Operaciones. Evento registrado en auditoría.',
      };
    }

    asignacion.estado_aprobacion = 'EN_GCS';
    return {
      ok: true,
      mensaje: `Misión ${asignacion.misiones?.codigo_mision} enviada a la GCS bajo token ${asignacion.token_aprobacion}.`,
    };
  }

  async listarHistorialSimulado(): Promise<HistorialAsignacion[]> {
    return [...this.historialSimulado];
  }
}