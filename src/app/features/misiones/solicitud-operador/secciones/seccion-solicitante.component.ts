import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoComponent } from '../../../../shared/campo/campo.component';
import { MENSAJES } from '../../../../core/validators/solicitud.validators';

@Component({
  selector: 'app-seccion-solicitante',
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent],
  templateUrl: './seccion-solicitante.component.html',
})
export class SeccionSolicitanteComponent {
  readonly group = input.required<FormGroup>();
  readonly msg = MENSAJES;
}