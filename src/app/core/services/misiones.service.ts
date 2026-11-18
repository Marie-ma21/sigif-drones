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
  private misionesMock: Mision[] = [
    {
      id: 89,
      codigo_mision: 'MIS-2026-089',
      nombre: 'Línea de transmisión eléctrica de 220 kV',
      estado: 'PROGRAMADA',
      nivel_riesgo: 'ALTO',
      etiqueta_zona: 'Zona de Alta Tensión',
    },
    {
      id: 90,
      codigo_mision: 'MIS-2026-090',
      nombre: 'Inspección Perimetral Sector Norte',
      estado: 'PROGRAMADA',
      nivel_riesgo: 'NORMAL',
      etiqueta_zona: null,
    },
  ];

  private historialMock: HistorialAsignacion[] = [];
  private consecutivoMision = 91;

  async listar(): Promise<Mision[]> {
    return [...this.misionesMock];
  }

  async asignarDron(misionId: number, dronId: number): Promise<ResultadoAsignacion> {
    const { error } = await supabase
      .from('asignaciones_misiones')
      .insert({ mision_id: misionId, dron_id: dronId });

    if (error) return { ok: false, mensajeError: error.message };
    return { ok: true };
  }

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

    this.historialMock.unshift({
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
    const item = this.historialMock.find((h) => h.id === asignacionId);
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

  async listarHistorial(): Promise<HistorialAsignacion[]> {
    return [...this.historialMock];
  }
}