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
  /** Mensajes propios de este campo, por tipo de error (ej. { formato: '...' }). */
  readonly mensajes = input<Record<string, string>>({});

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
    const propios = this.mensajes();
    for (const clave of Object.keys(errores)) {
      if (propios[clave]) return propios[clave];
    }
    if (errores['required']) return 'Este campo es obligatorio.';
    if (errores['email']) return 'Ingrese un correo válido.';
    if (errores['minlength']) return `Escriba al menos ${errores['minlength'].requiredLength} caracteres.`;
    if (errores['maxlength']) return `Escriba máximo ${errores['maxlength'].requiredLength} caracteres.`;
    if (errores['entero']) return 'Ingrese un número entero, sin decimales.';
    if (errores['decimales']) return 'Use máximo un decimal.';
    if (errores['min']) return `El valor mínimo es ${errores['min'].min}.`;
    if (errores['max']) return `El valor máximo es ${errores['max'].max}.`;
    if (errores['fechaPasada']) return 'La fecha no puede ser anterior a hoy.';
    if (errores['fechaLejana']) return 'La fecha no puede superar un año desde hoy.';
    if (errores['horaPasada']) return 'Esa hora ya pasó. Elija una hora posterior a la actual.';
    if (errores['parIncompleto']) return 'Si ingresa una coordenada, ingrese también la otra.';
    return 'El valor no es válido.';
  });
}