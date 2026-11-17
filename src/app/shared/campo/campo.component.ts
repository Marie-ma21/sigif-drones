import { Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Envoltorio de un campo: etiqueta, ayuda y mensaje de error.
 * El <input> / <select> se coloca dentro (proyección de contenido).
 */
@Component({
  selector: 'app-campo',
  standalone: true,
  template: `
    <label class="campo-etiqueta" [attr.for]="para()">{{ etiqueta() }}</label>
    <ng-content />
    @if (ayuda()) {
      <p class="campo-ayuda">{{ ayuda() }}</p>
    }
    @if (mensajeError()) {
      <p class="campo-error" role="alert">{{ mensajeError() }}</p>
    }
  `,
})
export class CampoComponent {
  readonly etiqueta = input.required<string>();
  readonly para = input<string>();
  readonly ayuda = input<string>();
  readonly control = input<AbstractControl | null>(null);

  /** Se incrementa cada vez que el control cambia (valor, estado o "tocado"). */
  private readonly cambios = signal(0);

  constructor() {
    effect((alLimpiar) => {
      const control = this.control();
      if (!control) return;
      const suscripcion = control.events.subscribe(() => this.cambios.update((n) => n + 1));
      alLimpiar(() => suscripcion.unsubscribe());
    });
  }

  readonly mensajeError = computed(() => {
    this.cambios();
    const control = this.control();
    const errores = control?.errors;
    if (!control || !control.touched || !errores) return '';
    if (errores['required']) return 'Este campo es obligatorio.';
    if (errores['email']) return 'Ingrese un correo válido.';
    if (errores['min']) return `El valor mínimo es ${errores['min'].min}.`;
    if (errores['fechaPasada']) return 'La fecha no puede ser anterior a hoy.';
    if (errores['max']) return `El valor máximo es ${errores['max'].max}.`;
    return 'El valor no es válido.';
  });
}