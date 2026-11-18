import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoComponent } from '../../../../shared/campo/campo.component';
import { PRIORIDADES, TIPOS_TAREA } from '../../../../core/models/solicitud.model';
import { fechaHoy, fechaMaxima } from '../../../../core/validators/solicitud.validators';


@Component({
  selector: 'app-seccion-mision',
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent],
  templateUrl: './seccion-mision.component.html',
})
export class SeccionMisionComponent {
  readonly group = input.required<FormGroup>();
  readonly tiposTarea = TIPOS_TAREA;
  readonly prioridades = PRIORIDADES;
  readonly fechaMin = fechaHoy();
  readonly fechaMax = fechaMaxima();
}