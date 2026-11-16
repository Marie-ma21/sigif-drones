export type EstadoSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface Dron {
  id: number;
  codigo: string;
  modelo: string | null;
  horas_vuelo: number;
  limite_horas: number;
  certificado_vigente: boolean;
  estado: EstadoSemaforo;
}