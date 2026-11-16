import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modulos = [
    { nombre: 'Rutas', ruta: '/rutas' },
    { nombre: 'Misiones', ruta: '/misiones/asignacion' },
    { nombre: 'Control', ruta: '/control' },
    { nombre: 'Telemetría', ruta: '/telemetria' },
    { nombre: 'Mantenimiento', ruta: '/mantenimiento' },
  ];

  async salir(): Promise<void> {
    await this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  etiquetaRol(): string {
    const rol = this.auth.profile()?.rol;
    switch (rol) {
      case 'coordinador':
        return 'Coordinador de Operaciones';
      case 'mantenimiento':
        return 'Ingeniero de Mantenimiento';
      case 'operador':
        return 'Operador de Drones';
      case 'analista':
        return 'Analista de Datos';
      default:
        return 'Usuario';
    }
  }
}