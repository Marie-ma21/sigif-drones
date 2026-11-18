import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ETIQUETA_ESTADO,
  EstadoSolicitud,
  Notificacion,
  Solicitud,
} from '../../../core/models/solicitud.model';
import { SolicitudesService } from '../../../core/services/solicitudes.service';

type EstadoPantalla = 'cargando' | 'listo';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './mis-solicitudes.component.html',
  styleUrl: './mis-solicitudes.component.scss',
})
export class MisSolicitudesComponent implements OnInit {
  private readonly solicitudesService = inject(SolicitudesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoPantalla = signal<EstadoPantalla>('cargando');
  readonly solicitudes = signal<Solicitud[]>([]);
  readonly notificaciones = signal<Notificacion[]>([]);

  readonly errorCarga = signal<string | null>(null);
  readonly enviandoId = signal<number | null>(null);
  readonly mensajes = signal<Record<number, { texto: string; tipo: 'bloqueo' | 'ok' }>>({});

  readonly kpis = computed(() => {
    const lista = this.solicitudes();
    return {
      total: lista.length,
      pendientes: lista.filter((s) => s.estado === 'PENDIENTE_APROBACION').length,
      aprobadas: lista.filter((s) => s.estado === 'APROBADA').length,
      enviadas: lista.filter((s) => s.estado === 'ENVIADA_GCS').length,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
    this.estadoPantalla.set('listo');

    // Se actualiza sola cuando el Coordinador firma (Realtime)
    const detener = this.solicitudesService.escucharCambios(() => void this.cargar());
    this.destroyRef.onDestroy(detener);
  }

  /** Nunca lanza: si falla, muestra el error en pantalla en vez de quedarse cargando. */
  private async cargar(): Promise<void> {
    try {
      const [solicitudes, notificaciones] = await Promise.all([
        this.solicitudesService.listarMias(),
        this.solicitudesService.listarNotificacionesNoLeidas(),
      ]);
      this.solicitudes.set(solicitudes);
      this.notificaciones.set(notificaciones);
      this.errorCarga.set(null);
    } catch (e) {
      this.errorCarga.set(e instanceof Error ? e.message : 'No fue posible cargar las solicitudes.');
    }
  }

  etiquetaEstado(estado: EstadoSolicitud): string {
    return ETIQUETA_ESTADO[estado];
  }

  claseEstado(estado: EstadoSolicitud): string {
    return estado.toLowerCase().replace(/_/g, '-');
  }

  /** El botón se ve "con candado" mientras no haya aprobación; al pulsarlo igual se registra el intento. */
  estaBloqueada(s: Solicitud): boolean {
    return s.estado !== 'APROBADA';
  }

  async enviarAGcs(s: Solicitud): Promise<void> {
    if (s.estado === 'ENVIADA_GCS') return;

    this.enviandoId.set(s.id);
    const respuesta = await this.solicitudesService.enviarAGcs(s.id);
    this.enviandoId.set(null);

    this.mensajes.update((m) => ({
      ...m,
      [s.id]: {
        texto: respuesta.mensaje ?? (respuesta.ok ? 'Misión enviada a la GCS.' : 'No fue posible enviar.'),
        tipo: respuesta.ok ? 'ok' : 'bloqueo',
      },
    }));

    if (respuesta.ok) await this.cargar();
  }

  async marcarLeida(n: Notificacion): Promise<void> {
    await this.solicitudesService.marcarNotificacionLeida(n.id);
    this.notificaciones.update((lista) => lista.filter((x) => x.id !== n.id));
  }
}