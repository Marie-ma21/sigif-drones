import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoComponent } from '../../../../shared/campo/campo.component';
import { LIMITE_VIENTO_KMH } from '../../../../core/models/solicitud.model';

@Component({
  selector: 'app-seccion-seguridad',
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent],
  templateUrl: './seccion-seguridad.component.html',
})
export class SeccionSeguridadComponent {
  readonly group = input.required<FormGroup>();
  readonly limiteViento = LIMITE_VIENTO_KMH;

  get permisosSinMarcar(): boolean {
    const c = this.group().controls['permisosConfirmados'];
    return c.touched && c.invalid;
  }
}