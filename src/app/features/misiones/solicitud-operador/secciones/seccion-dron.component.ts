import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoComponent } from '../../../../shared/campo/campo.component';
import { CARGAS_UTIL, TIPOS_DRON } from '../../../../core/models/solicitud.model';

@Component({
  selector: 'app-seccion-dron',
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent],
  templateUrl: './seccion-dron.component.html',
})
export class SeccionDronComponent {
  readonly group = input.required<FormGroup>();
  readonly tiposDron = TIPOS_DRON;
  readonly cargasUtil = CARGAS_UTIL;

  estaMarcada(carga: string): boolean {
    return (this.group().controls['cargaUtil'].value as string[]).includes(carga);
  }

  alternarCarga(carga: string, marcada: boolean): void {
    const control = this.group().controls['cargaUtil'];
    const actuales = control.value as string[];
    control.setValue(marcada ? [...actuales, carga] : actuales.filter((c) => c !== carga));
  }
}