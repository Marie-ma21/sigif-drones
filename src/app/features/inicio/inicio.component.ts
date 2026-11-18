import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent {
  protected readonly auth = inject(AuthService);

  /** Si ya inició sesión, el botón lo lleva a la pantalla principal de su rol. */
  readonly destino = computed(() => {
    switch (this.auth.profile()?.rol) {
      case 'coordinador':
        return '/misiones/asignacion';
      case 'operador':
        return '/misiones/mis-solicitudes';
      default:
        return null;
    }
  });
}