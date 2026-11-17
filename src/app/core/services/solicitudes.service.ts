import { Injectable } from '@angular/core';
import { supabase } from './supabase-client';
import {
  FormularioSolicitud,
  Notificacion,
  RespuestaRpc,
  Solicitud,
} from '../models/solicitud.model';

export interface ResultadoCreacion {
  ok: boolean;
  solicitud?: Pick<Solicitud, 'codigo' | 'estado' | 'zona_critica' | 'nivel_riesgo'>;
  mensajeError?: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly db = supabase;

  /**
   * Crea la solicitud. El estado, el nivel de riesgo y el código los decide
   * el TRIGGER de la base de datos (el cliente no puede forzarlos).
   */
  async crear(f: FormularioSolicitud): Promise<ResultadoCreacion> {
    const { data, error } = await this.db
      .from('solicitudes_mision')
      .insert({
        operador_nombre: f.solicitante.nombre,
        operador_documento: f.solicitante.documento,
        operador_correo: f.solicitante.correo,
        operador_telefono: f.solicitante.telefono || null,
        operador_licencia: f.solicitante.licencia,
        area: f.solicitante.area || null,
        titulo: f.mision.titulo,
        tipo_tarea: f.mision.tipoTarea,
        prioridad: f.mision.prioridad,
        descripcion: f.mision.descripcion || null,
        fecha_inicio: f.mision.fechaInicio,
        hora_inicio: f.mision.horaInicio,
        duracion_min: f.mision.duracionMin,
        sitio: f.ubicacion.sitio,
        latitud: f.ubicacion.latitud,
        longitud: f.ubicacion.longitud,
        altitud_max_m: f.ubicacion.altitudMaxM,
        zona_critica: f.ubicacion.zonaCritica,
        tipo_dron: f.dron.tipo,
        modelo_dron: f.dron.modelo || null,
        num_baterias: f.dron.numBaterias,
        carga_util: f.dron.cargaUtil,
        viento_max_kmh: f.seguridad.vientoMaxKmh,
        punto_retorno: f.seguridad.puntoRetorno || null,
        riesgos: f.seguridad.riesgos || null,
        permisos_confirmados: f.seguridad.permisosConfirmados,
        acepta_condiciones: f.confirmacion.aceptaCondiciones,
      })
      .select('codigo, estado, zona_critica, nivel_riesgo')
      .single();

    if (error) return { ok: false, mensajeError: error.message };
    return { ok: true, solicitud: data };
  }

  async listarMias(): Promise<Solicitud[]> {
    const { data, error } = await this.db
      .from('solicitudes_mision')
      .select('*')
      .order('creada_en', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Solicitud[];
  }

  /**
   * Intenta enviar la misión a la GCS. La función de Postgres decide:
   * si falta la aprobación digital, la BLOQUEA y deja registro de auditoría.
   */
  async enviarAGcs(solicitudId: number): Promise<RespuestaRpc> {
    const { data, error } = await this.db.rpc('enviar_a_gcs', { p_solicitud_id: solicitudId });
    if (error) return { ok: false, mensaje: error.message };
    return data as RespuestaRpc;
  }

  // ---------- Coordinador de Operaciones (paso 4 de CP-RF03-01) ----------

  /** Solicitudes que esperan la firma digital. La RLS deja leerlas solo al Coordinador. */
  async listarPendientesDeAprobacion(): Promise<Solicitud[]> {
    const { data, error } = await this.db
      .from('solicitudes_mision')
      .select('*')
      .eq('estado', 'PENDIENTE_APROBACION')
      .order('creada_en', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Solicitud[];
  }

  /** Aprueba con firma digital: la función de Postgres genera el token, notifica y audita. */
  async aprobar(solicitudId: number): Promise<RespuestaRpc> {
    const { data, error } = await this.db.rpc('aprobar_solicitud', { p_solicitud_id: solicitudId });
    if (error) return { ok: false, mensaje: error.message };
    return data as RespuestaRpc;
  }

  async rechazar(solicitudId: number, motivo: string): Promise<RespuestaRpc> {
    const { data, error } = await this.db.rpc('rechazar_solicitud', {
      p_solicitud_id: solicitudId,
      p_motivo: motivo,
    });
    if (error) return { ok: false, mensaje: error.message };
    return data as RespuestaRpc;
  }

  async listarNotificacionesNoLeidas(): Promise<Notificacion[]> {
    const { data, error } = await this.db
      .from('notificaciones')
      .select('*')
      .eq('leida', false)
      .order('creada_en', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Notificacion[];
  }

  async marcarNotificacionLeida(id: number): Promise<void> {
    await this.db.from('notificaciones').update({ leida: true }).eq('id', id);
  }

  /**
   * Avisa cuando cambia una solicitud o llega una notificación (Realtime).
   * Devuelve la función para cancelar la suscripción.
   */
  escucharCambios(alCambiar: () => void): () => void {
    const canal = this.db
      .channel('operador-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_mision' }, alCambiar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, alCambiar)
      .subscribe();
    return () => {
      void this.db.removeChannel(canal);
    };
  }
}