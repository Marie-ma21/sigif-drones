export type EstadoSolicitud =
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ENVIADA_GCS'
  | 'CANCELADA';

export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO';

/** Fila de la tabla solicitudes_mision */
export interface Solicitud {
  id: number;
  codigo: string;
  estado: EstadoSolicitud;
  nivel_riesgo: NivelRiesgo;
  zona_critica: boolean;
  titulo: string;
  tipo_tarea: string;
  tipo_dron: string;
  prioridad: string;
  fecha_inicio: string;
  hora_inicio: string;
  sitio: string;
  operador_nombre: string;
  altitud_max_m: number;
  duracion_min: number;
  riesgos: string | null;
  token_aprobacion: string | null;
  aprobada_en: string | null;
  motivo_rechazo: string | null;
  enviada_gcs_en: string | null;
  creada_en: string;
}

export interface Notificacion {
  id: number;
  solicitud_id: number | null;
  mensaje: string;
  leida: boolean;
  creada_en: string;
}

export interface RespuestaRpc {
  ok: boolean;
  mensaje?: string;
  bloqueado?: boolean;
  token?: string;
}

export interface FormularioSolicitud {
  solicitante: {
    nombre: string;
    documento: string;
    correo: string;
    telefono: string;
    licencia: string;
    area: string;
  };
  mision: {
    titulo: string;
    tipoTarea: string;
    prioridad: string;
    descripcion: string;
    fechaInicio: string;
    horaInicio: string;
    duracionMin: number | null;
  };
  ubicacion: {
    sitio: string;
    latitud: number | null;
    longitud: number | null;
    altitudMaxM: number | null;
    zonaCritica: boolean;
  };
  dron: {
    tipo: string;
    modelo: string;
    numBaterias: number | null;
    cargaUtil: string[];
  };
  seguridad: {
    vientoMaxKmh: number | null;
    puntoRetorno: string;
    riesgos: string;
    permisosConfirmados: boolean;
  };
  confirmacion: {
    aceptaCondiciones: boolean;
  };
}

/** Límites de seguridad (CU-02 y CU-04). */
export const LIMITE_ALTITUD_M = 120;
export const LIMITE_VIENTO_KMH = 35;

export const TAREAS_ALTA_TENSION = ['Inspección de torres eléctricas'];


export function esAltaTension(tipoTarea: string, zonaCriticaMarcada: boolean): boolean {
  return zonaCriticaMarcada || TAREAS_ALTA_TENSION.includes(tipoTarea);
}

export const TIPOS_TAREA = [
  'Inspección de torres eléctricas',
  'Inspección de oleoductos',
  'Inspección de parques eólicos',
  'Inspección de parques solares',
  'Termografía',
  'Mapeo y fotogrametría',
];

export const TIPOS_DRON = [
  { nombre: 'Multirrotor', descripcion: 'Despegue vertical, ideal para inspección de detalle' },
  { nombre: 'Ala fija', descripcion: 'Mayor autonomía, ideal para corredores largos' },
  { nombre: 'VTOL híbrido', descripcion: 'Despegue vertical y vuelo eficiente de crucero' },
];

export const PRIORIDADES = [
  { valor: 'BAJA', etiqueta: 'Baja' },
  { valor: 'MEDIA', etiqueta: 'Media' },
  { valor: 'ALTA', etiqueta: 'Alta' },
  { valor: 'URGENTE', etiqueta: 'Urgente' },
];

export const CARGAS_UTIL = ['Cámara RGB', 'Cámara térmica', 'LiDAR', 'Multiespectral', 'Otra'];

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE_APROBACION: 'Pendiente de aprobación del Coordinador',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ENVIADA_GCS: 'Enviada a la GCS',
  CANCELADA: 'Cancelada',
};