import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-seccion-confirmacion',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './seccion-confirmacion.component.html',
})
export class SeccionConfirmacionComponent {
  readonly group = input.required<FormGroup>();
  readonly enviando = input(false);
  readonly anterior = output<void>();
  readonly cancelar = output<void>();

  get sinAceptar(): boolean {
    const c = this.group().controls['aceptaCondiciones'];
    return c.touched && c.invalid;
  }
}