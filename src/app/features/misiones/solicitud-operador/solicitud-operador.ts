import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  EstadoSolicitud,
  LIMITE_ALTITUD_M,
  LIMITE_VIENTO_KMH,
  NivelRiesgo,
  TAREAS_ALTA_TENSION,
  esAltaTension,
} from '../../../core/models/solicitud.model';
import { SolicitudesService } from '../../../core/services/solicitudes.service';
import {
  LIMITES,
  REGEX,
  entero,
  fechaNoLejana,
  fechaNoPasada,
  formato,
  horaNoPasada,
  longitud,
  normalizarSolicitud,
  parCoordenadas,
  requerido,
  unDecimal,
} from '../../../core/validators/solicitud.validators';
import { SeccionSolicitanteComponent } from './secciones/seccion-solicitante.component';
import { SeccionMisionComponent } from './secciones/seccion-mision.component';
import { SeccionUbicacionComponent } from './secciones/seccion-ubicacion.component';
import { SeccionDronComponent } from './secciones/seccion-dron.component';
import { SeccionSeguridadComponent } from './secciones/seccion-seguridad.component';
import { SeccionConfirmacionComponent } from './secciones/seccion-confirmacion.component';
import { ResumenSolicitudComponent } from './resumen-solicitud/resumen-solicitud.component';

interface ResultadoEnvio {
  codigo: string;
  estado: EstadoSolicitud;
  zona_critica: boolean;
  nivel_riesgo: NivelRiesgo;
}

@Component({
  selector: 'app-solicitud-operador',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SeccionSolicitanteComponent,
    SeccionMisionComponent,
    SeccionUbicacionComponent,
    SeccionDronComponent,
    SeccionSeguridadComponent,
    SeccionConfirmacionComponent,
    ResumenSolicitudComponent,
  ],
  templateUrl: './solicitud-operador.html',
  styleUrl: './solicitud-operador.scss',
})
export class SolicitudOperadorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly solicitudes = inject(SolicitudesService);

  /** Secciones del formulario, en el orden en que se completan. */
  readonly pasos = [
    { clave: 'solicitante', titulo: 'Solicitante' },
    { clave: 'mision', titulo: 'Misión' },
    { clave: 'ubicacion', titulo: 'Ubicación' },
    { clave: 'dron', titulo: 'Dron' },
    { clave: 'seguridad', titulo: 'Seguridad' },
    { clave: 'confirmacion', titulo: 'Confirmación' },
  ] as const;
  readonly ultimoPaso = this.pasos.length - 1;
  readonly pasoActual = signal(0);
  /** Hasta qué paso llegó el usuario: solo puede volver a los ya visitados. */
  readonly pasoMaximo = signal(0);

  readonly enviando = signal(false);
  readonly errorEnvio = signal<string | null>(null);
  readonly resultado = signal<ResultadoEnvio | null>(null);

  /** Un grupo por sección: cada componente de sección recibe el suyo. */
  readonly form = this.fb.nonNullable.group({
    solicitante: this.fb.nonNullable.group({
      nombre: ['', Validators.required],
      documento: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      licencia: ['', Validators.required],
      area: [''],
    }),
    mision: this.fb.nonNullable.group({
      titulo: ['', Validators.required],
      tipoTarea: ['', Validators.required],
      prioridad: ['MEDIA', Validators.required],
      descripcion: [''],
      fechaInicio: ['', [Validators.required, fechaNoPasada]],
      horaInicio: ['', Validators.required],
      duracionMin: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    }),
    ubicacion: this.fb.nonNullable.group({
      sitio: ['', Validators.required],
      latitud: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
      longitud: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
      altitudMaxM: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(0),
        Validators.max(LIMITE_ALTITUD_M),
      ]),
      zonaCritica: [false],
    }),
    dron: this.fb.nonNullable.group({
      tipo: ['Multirrotor', Validators.required],
      modelo: [''],
      numBaterias: this.fb.nonNullable.control<number | null>(1, [Validators.min(1)]),
      cargaUtil: this.fb.nonNullable.control<string[]>([]),
    }),
    seguridad: this.fb.nonNullable.group({
      vientoMaxKmh: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(LIMITE_VIENTO_KMH),
      ]),
      puntoRetorno: [''],
      riesgos: [''],
      permisosConfirmados: [false, Validators.requiredTrue],
    }),
    confirmacion: this.fb.nonNullable.group({
      aceptaCondiciones: [false, Validators.requiredTrue],
    }),
  });

  /** Valor del formulario como signal, para el resumen lateral. */
  readonly valor = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /**
   * Paso 2 de CP-RF03-01: el sistema detecta la "Zona de Alta Tensión" por el tipo de tarea
   * o porque el operador marcó la zona crítica. El servidor vuelve a decidirlo con la misma regla.
   */
  readonly altaTension = computed(() =>
    esAltaTension(this.valor().mision.tipoTarea, this.valor().ubicacion.zonaCritica),
  );

  readonly pasoNavegable = computed(() => {
    this.valor(); // dependencia: recalcula cada vez que cambia el formulario
    const primerInvalido = this.pasos.findIndex((p) => this.form.controls[p.clave].invalid);
    const limite = primerInvalido === -1 ? this.ultimoPaso : primerInvalido;
    return Math.min(limite, this.pasoMaximo());
  });

  constructor() {
    // Si la tarea implica alta tensión, la casilla se marca sola y queda bloqueada
    this.form.controls.mision.controls.tipoTarea.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((tarea) => this.sincronizarZonaCritica(tarea));

      // Validaciones que dependen de otro campo: se revalidan cuando ese campo cambia
    const m = this.form.controls.mision.controls;
    const u = this.form.controls.ubicacion.controls;
    m.fechaInicio.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => m.horaInicio.updateValueAndValidity());
    // emitEvent:false evita que latitud y longitud se revaliden una a otra sin fin
    u.latitud.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => u.longitud.updateValueAndValidity({ emitEvent: false }));
    u.longitud.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => u.latitud.updateValueAndValidity({ emitEvent: false }));
  }

  /** Casilla deshabilitada = marcada por el sistema según el tipo de tarea. */
  private sincronizarZonaCritica(tarea: string): void {
    const zona = this.form.controls.ubicacion.controls.zonaCritica;
    if (TAREAS_ALTA_TENSION.includes(tarea)) {
      if (zona.enabled) {
        zona.setValue(true);
        zona.disable();
      }
    } else if (zona.disabled) {
      zona.enable();
      zona.setValue(false);
    }
  }

  siguiente(): void {
    const grupo = this.form.controls[this.pasos[this.pasoActual()].clave];
    if (grupo.invalid) {
      grupo.markAllAsTouched();
      return;
    }
    const nuevo = Math.min(this.pasoActual() + 1, this.ultimoPaso);
    this.pasoActual.set(nuevo);
    this.pasoMaximo.update((m) => Math.max(m, nuevo));
  }

  anterior(): void {
    this.pasoActual.update((p) => Math.max(0, p - 1));
  }

  irAPaso(indice: number): void {
    if (indice === this.pasoActual()) return;

    // Retroceder siempre se permite; avanzar solo si todos los pasos previos están completos
    if (indice > this.pasoNavegable()) {
      this.form.controls[this.pasos[this.pasoActual()].clave].markAllAsTouched();
      return;
    }
    this.pasoActual.set(indice);
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    // Enter en un campo de un paso intermedio avanza; no envía
    if (this.pasoActual() < this.ultimoPaso) {
      this.siguiente();
      return;
    }

    // Si algún paso quedó inválido (p. ej. se editó uno anterior), vuelve a ese paso
    const invalido = this.pasos.findIndex((p) => this.form.controls[p.clave].invalid);
    if (invalido >= 0) {
      this.pasoActual.set(invalido);
      this.form.controls[this.pasos[invalido].clave].markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);

 // Mismo formato para todos los datos: sin espacios sobrantes, correo en minúscula, licencia en mayúscula
    const datos = normalizarSolicitud(this.form.getRawValue());
    const respuesta = await this.solicitudes.crear({
      ...datos,
      ubicacion: { ...datos.ubicacion, zonaCritica: this.altaTension() },
    });

    this.enviando.set(false);

    if (!respuesta.ok || !respuesta.solicitud) {
      this.errorEnvio.set(respuesta.mensajeError ?? 'No fue posible enviar la solicitud.');
      return;
    }

    // Registrada: se limpia todo de inmediato para que no pueda reenviarse lo mismo
    this.resultado.set(respuesta.solicitud);
    this.reiniciarFormulario();
  }

  private reiniciarFormulario(): void {
    this.form.reset();
    this.sincronizarZonaCritica('');
    this.pasoActual.set(0);
    this.pasoMaximo.set(0);
  }

  nuevaSolicitud(): void {
    this.reiniciarFormulario();
    this.resultado.set(null);
    this.errorEnvio.set(null);
  }
}