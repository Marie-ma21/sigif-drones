export interface Mision {
  id: number;
  codigo_mision: string;
  nombre: string;
  estado?: string;
}

export interface AsignacionMision {
  id: number;
  mision_id: number;
  dron_id: number;
  coordinador_id: string | null;
  fecha_asignacion: string;
}

/** Fila del historial, con los códigos ya "embebidos" vía la relación FK */
export interface HistorialAsignacion {
  id: number;
  fecha_asignacion: string;
  drones: { codigo: string } | null;
  misiones: { codigo_mision: string } | null;
}

