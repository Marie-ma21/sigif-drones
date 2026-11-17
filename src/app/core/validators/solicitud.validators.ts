import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormularioSolicitud } from '../models/solicitud.model';

/**
 * Reglas de formato del formulario de solicitud de misión.
 * Se centralizan aquí para que todas las respuestas queden con el mismo formato.
 */
export const LIMITES = {
  nombre: { min: 5, max: 80 },
  documento: { min: 6, max: 10 },
  correo: { max: 100 },
  licencia: { max: 11 },
  area: { max: 60 },
  titulo: { min: 5, max: 100 },
  descripcion: { max: 500 },
  duracionMin: { min: 5, max: 240 },
  sitio: { min: 3, max: 100 },
  altitudMinM: 1,
  modelo: { max: 50 },
  baterias: { min: 1, max: 20 },
  puntoRetorno: { max: 100 },
  riesgos: { max: 500 },
  diasMaximosHaciaAdelante: 365,
} as const;

export const REGEX = {
  /** Nombre y apellido: solo letras, espacios, apóstrofo, punto o guion. Mínimo dos palabras. */
  nombre: /^\p{L}[\p{L}'.-]*( \p{L}[\p{L}'.-]*)+$/u,
  /** Documento: solo dígitos (6 a 10). */
  documento: /^\d{6,10}$/,
  correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  /** Celular colombiano: 10 dígitos que empiezan por 3. */
  telefono: /^3\d{9}$/,
  /** Licencia u operador: 2 a 4 letras, guion y 3 a 6 números. Ej.: OP-102 */
  licencia: /^[A-Za-z]{2,4}-\d{3,6}$/,
};

/** Mensajes por campo para los errores de tipo "formato". */
export const MENSAJES = {
  nombre: { formato: 'Escriba nombre y apellido, solo con letras (sin números ni símbolos).' },
  documento: { formato: 'Solo números, sin puntos ni espacios (de 6 a 10 dígitos).' },
  correo: { formato: 'Escriba un correo válido, por ejemplo operador@empresa.com.' },
  telefono: { formato: 'Escriba un celular de 10 dígitos que empiece por 3, sin espacios.' },
  licencia: { formato: 'Use el formato LETRAS-NÚMEROS, por ejemplo OP-102.' },
} as const;

/** Quita espacios sobrantes (inicio, final y repetidos). */
export const limpiar = (valor: unknown): string => String(valor ?? '').replace(/\s+/g, ' ').trim();

const dos = (n: number) => String(n).padStart(2, '0');
export const fechaATexto = (d: Date): string => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const fechaHoy = (): string => fechaATexto(new Date());
export const fechaMaxima = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + LIMITES.diasMaximosHaciaAdelante);
  return fechaATexto(d);
};

/** Como Validators.required, pero un texto de solo espacios cuenta como vacío. */
export const requerido: ValidatorFn = (c) => (limpiar(c.value) ? null : { required: true });

export function longitud(min: number, max: number): ValidatorFn {
  return (c) => {
    const n = limpiar(c.value).length;
    if (n === 0) return null; // lo vacío lo decide "requerido"
    if (n < min) return { minlength: { requiredLength: min, actualLength: n } };
    if (n > max) return { maxlength: { requiredLength: max, actualLength: n } };
    return null;
  };
}

export function formato(regex: RegExp): ValidatorFn {
  return (c) => {
    const v = limpiar(c.value);
    return !v || regex.test(v) ? null : { formato: true };
  };
}

export const entero: ValidatorFn = (c) =>
  c.value == null || c.value === '' || Number.isInteger(c.value) ? null : { entero: true };

/** La columna altitud_max_m admite un solo decimal. */
export const unDecimal: ValidatorFn = (c) => {
  const v = c.value;
  if (v == null || v === '') return null;
  return Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? null : { decimales: true };
};

export const fechaNoPasada: ValidatorFn = (c) => {
  const v = c.value as string;
  return !v || v >= fechaHoy() ? null : { fechaPasada: true };
};

export const fechaNoLejana: ValidatorFn = (c) => {
  const v = c.value as string;
  return !v || v <= fechaMaxima() ? null : { fechaLejana: true };
};

/** Si la misión es hoy, la hora de inicio no puede haber pasado. Lee `fechaInicio` del mismo grupo. */
export const horaNoPasada: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const hora = c.value as string;
  const fecha = c.parent?.get('fechaInicio')?.value as string | undefined;
  if (!hora || !fecha || fecha !== fechaHoy()) return null;
  const ahora = new Date();
  return hora < `${dos(ahora.getHours())}:${dos(ahora.getMinutes())}` ? { horaPasada: true } : null;
};

/** Latitud y longitud van juntas: si se escribe una, la otra es obligatoria. */
export function parCoordenadas(otro: string): ValidatorFn {
  const tiene = (x: unknown) => x !== null && x !== undefined && x !== '';
  return (c) => (!tiene(c.value) && tiene(c.parent?.get(otro)?.value) ? { parIncompleto: true } : null);
}

/** Deja todos los datos con el mismo formato antes de guardarlos. */
export function normalizarSolicitud(f: FormularioSolicitud): FormularioSolicitud {
  return {
    solicitante: {
      nombre: limpiar(f.solicitante.nombre),
      documento: limpiar(f.solicitante.documento),
      correo: limpiar(f.solicitante.correo).toLowerCase(),
      telefono: limpiar(f.solicitante.telefono),
      licencia: limpiar(f.solicitante.licencia).toUpperCase(),
      area: limpiar(f.solicitante.area),
    },
    mision: {
      ...f.mision,
      titulo: limpiar(f.mision.titulo),
      descripcion: f.mision.descripcion.trim(),
    },
    ubicacion: { ...f.ubicacion, sitio: limpiar(f.ubicacion.sitio) },
    dron: { ...f.dron, modelo: limpiar(f.dron.modelo) },
    seguridad: {
      ...f.seguridad,
      puntoRetorno: limpiar(f.seguridad.puntoRetorno),
      riesgos: f.seguridad.riesgos.trim(),
    },
    confirmacion: { ...f.confirmacion },
  };
}