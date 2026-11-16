import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DronesService } from '../../../core/services/drones.service';
import { MisionesService } from '../../../core/services/misiones.service';
import { Dron, EstadoSemaforo } from '../../../core/models/dron.model';
import { Mision, HistorialAsignacion } from '../../../core/models/mision.model';

type EstadoPantalla = 'cargando' | 'listo';

@Component({
  selector: 'app-asignacion-mision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignacion-mision.component.html',
  styleUrl: './asignacion-mision.component.scss',
})
export class AsignacionMisionComponent implements OnInit {
  private readonly dronesService = inject(DronesService);
  private readonly misionesService = inject(MisionesService);

  readonly estadoPantalla = signal<EstadoPantalla>('cargando');

  readonly drones = signal<Dron[]>([]);
  readonly misiones = signal<Mision[]>([]);
  readonly historial = signal<HistorialAsignacion[]>([]);

  readonly dronSeleccionadoId = signal<number | null>(null);
  readonly misionSeleccionadaId = signal<number | null>(null);

  readonly asignando = signal(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly notificado = signal(false);

  /** El dron completo que corresponde a la fila seleccionada en la tabla de flota */
  readonly dronSeleccionado = computed<Dron | undefined>(() => {
    const id = this.dronSeleccionadoId();
    return this.drones().find((d) => d.id === id);
  });

  readonly estaBloqueado = computed<boolean>(() => this.dronSeleccionado()?.estado === 'ROJO');

  /** KPIs de la flota para el panel superior (HU02: "disponibilidad técnica de la flota") */
  readonly kpis = computed(() => {
    const lista = this.drones();
    return {
      total: lista.length,
      verde: lista.filter((d) => d.estado === 'VERDE').length,
      amarillo: lista.filter((d) => d.estado === 'AMARILLO').length,
      rojo: lista.filter((d) => d.estado === 'ROJO').length,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.cargarTodo();
  }

  private async cargarTodo(): Promise<void> {
    const [drones, misiones, historial] = await Promise.all([
      this.dronesService.listar(),
      this.misionesService.listar(),
      this.misionesService.listarHistorial(),
    ]);

    this.drones.set(drones);
    this.misiones.set(misiones);
    this.historial.set(historial);

    if (!this.dronSeleccionadoId() && drones.length) this.dronSeleccionadoId.set(drones[0].id);
    if (!this.misionSeleccionadaId() && misiones.length) this.misionSeleccionadaId.set(misiones[0].id);

    this.estadoPantalla.set('listo');
  }

  seleccionarDron(id: number): void {
    if (this.dronSeleccionadoId() === id) return;
    this.dronSeleccionadoId.set(id);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.notificado.set(false);
  }

  alCambiarMision(): void {
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.notificado.set(false);
  }

  porcentajeHoras(dron: Dron): number {
    return Math.min(100, Math.round((dron.horas_vuelo / dron.limite_horas) * 100));
  }

  etiquetaEstado(estado: EstadoSemaforo): string {
    switch (estado) {
      case 'ROJO':
        return 'Bloqueado';
      case 'AMARILLO':
        return 'Próx. mantenimiento';
      case 'VERDE':
        return 'Habilitado';
    }
  }

  textoSemaforo(): string {
    switch (this.dronSeleccionado()?.estado) {
      case 'ROJO':
        return 'BLOQUEADO: Mantenimiento Vencido';
      case 'AMARILLO':
        return 'MANTENIMIENTO PRÓXIMO';
      case 'VERDE':
        return 'HABILITADO';
      default:
        return '';
    }
  }

  textoAyudaBloqueo(): string {
    const dron = this.dronSeleccionado();
    if (!dron) return '';
    if (dron.horas_vuelo >= dron.limite_horas) {
      return `Acción bloqueada automáticamente: ${dron.horas_vuelo}h de ${dron.limite_horas}h límite. Se requiere emisión de certificación digital.`;
    }
    return 'Acción bloqueada automáticamente: certificación de mantenimiento vencida. Se requiere emisión de certificación digital.';
  }

  async asignar(): Promise<void> {
    const dronId = this.dronSeleccionadoId();
    const misionId = this.misionSeleccionadaId();
    if (!dronId || !misionId || this.estaBloqueado()) return;

    this.asignando.set(true);
    this.mensajeError.set(null);
    this.mensajeExito.set(null);

    const resultado = await this.misionesService.asignarDron(misionId, dronId);

    this.asignando.set(false);

    if (!resultado.ok) {
      // Este mensaje viene directo del trigger de Postgres (RN-01):
      // es el rechazo "de backend" del caso CP-RF08-01.
      this.mensajeError.set(resultado.mensajeError ?? 'No fue posible asignar la misión.');
      return;
    }

    this.mensajeExito.set('Dron asignado a la misión correctamente.');
    this.historial.set(await this.misionesService.listarHistorial());
  }

  notificarMantenimiento(): void {
    // Paso intermedio del mockup: por ahora es una confirmación local.
    // Próxima iteración: insertar en una tabla "notificaciones" y que
    // Mantenimiento la vea en su propia pantalla.
    this.notificado.set(true);
  }
}

