import { Component, computed, input } from '@angular/core';
import {
  FormularioSolicitud,
  LIMITE_ALTITUD_M,
  LIMITE_VIENTO_KMH,
  esAltaTension,
} from '../../../../core/models/solicitud.model';

@Component({
  selector: 'app-resumen-solicitud',
  standalone: true,
  templateUrl: './resumen-solicitud.component.html',
  styleUrl: './resumen-solicitud.component.scss',
})
export class ResumenSolicitudComponent {
  readonly valor = input.required<FormularioSolicitud>();
  readonly limiteAltitud = LIMITE_ALTITUD_M;
  readonly limiteViento = LIMITE_VIENTO_KMH;

  /** Vista previa: la decisión final siempre la toma el servidor (trigger de la base de datos). */
  readonly requiereAprobacion = computed(
    () => esAltaTension(this.valor().mision.tipoTarea, this.valor().ubicacion.zonaCritica),
  );
}