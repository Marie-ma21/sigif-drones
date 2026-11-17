// export interface Mision {
//   id: number;
//   codigo_mision: string;
//   nombre: string;
//   estado?: string;
// }

// export interface AsignacionMision {
//   id: number;
//   mision_id: number;
//   dron_id: number;
//   coordinador_id: string | null;
//   fecha_asignacion: string;
// }

// /** Fila del historial, con los códigos ya "embebidos" vía la relación FK */
// export interface HistorialAsignacion {
//   id: number;
//   fecha_asignacion: string;
//   drones: { codigo: string } | null;
//   misiones: { codigo_mision: string } | null;
// }


//PRUEBA OPERADOR
export type NivelRiesgo = 'NORMAL' | 'ALTO';
export type EstadoAprobacion = 'PENDIENTE_APROBACION' | 'APROBADA' | 'EN_GCS';

export interface SolicitudVueloPayload {
  operadorNombre: string;
  operadorDocumento: string;
  operadorCorreo: string;
  operadorTelefono: string;
  operadorLicencia: string;
  areaOrganizacion: string;
  titulo: string;
  tipoTarea: string;
  prioridad: string;
  descripcion: string;
  fechaInicio: string;
  horaInicio: string;
  duracionEstimadaMin: number;
  sitioNombre: string;
  latitud: string;
  longitud: string;
  altitudMaxM: number;
  zonaCritica: boolean;
  dronId: number;
  numBaterias: number;
  vientoMaxKmh: number;
  puntoRetorno: string;
  riesgos: string;
  permisosConfirmados: boolean;
  aceptaCondiciones: boolean;
}

export interface Mision {
  id: number;
  codigo_mision: string;
  nombre: string;
  estado: string;
  nivel_riesgo: NivelRiesgo;
  etiqueta_zona?: string | null;
}

export interface HistorialAsignacion {
  id: number;
  fecha_asignacion: string;
  estado_aprobacion: EstadoAprobacion;
  token_aprobacion?: string | null;
  fecha_aprobacion?: string | null;
  detalle_tecnico?: SolicitudVueloPayload;
  drones?: {
    id: number;
    codigo: string;
    modelo?: string | null;
  };
  misiones?: {
    id: number;
    codigo_mision: string;
    nombre: string;
    nivel_riesgo: NivelRiesgo;
    etiqueta_zona?: string | null;
  };
}
