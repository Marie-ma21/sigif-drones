import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoComponent } from '../../../../shared/campo/campo.component';
import { LIMITE_ALTITUD_M } from '../../../../core/models/solicitud.model';

@Component({
  selector: 'app-seccion-ubicacion',
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent],
  templateUrl: './seccion-ubicacion.component.html',
})
export class SeccionUbicacionComponent {
  readonly group = input.required<FormGroup>();
  readonly altaTension = input(false);
  readonly limiteAltitud = LIMITE_ALTITUD_M;
}