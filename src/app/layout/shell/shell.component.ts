import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

interface Modulo {
  nombre: string;
  /** Sin ruta = módulo aún no disponible. */
  ruta?: string;
  /** Trazo SVG (viewBox 24x24) del ícono del módulo. */
  icono: string;
}

/** A partir de este ancho el menú lateral es fijo; por debajo es un panel deslizable. */
const ANCHO_ESCRITORIO = 1024;
const CLAVE_COLAPSADO = 'shell.sidebar.colapsado';

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

  readonly modulos: Modulo[] = [
    {
      nombre: 'Rutas',
      ruta: '/rutas',
      icono: 'M8 18h7a3 3 0 000-6H9a3 3 0 010-6h7 M6 20a2 2 0 100-4 2 2 0 000 4z M18 8a2 2 0 100-4 2 2 0 000 4z',
    },
    {
      nombre: 'Misiones',
      ruta: '/misiones/asignacion',
      icono: 'M5 21V4 M5 4h11l-2 4 2 4H5',
    },
    {
      nombre: 'Control',
      ruta: '/control',
      icono: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4',
    },
    {
      nombre: 'Telemetría',
      ruta: '/telemetria',
      icono: 'M3 12h4l3-8 4 16 3-8h4',
    },
    {
      nombre: 'Mantenimiento',
      ruta: '/mantenimiento',
      icono:
        'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
    },
  ];

  /** Escritorio: menú reducido a íconos. Se recuerda entre sesiones. */
  readonly colapsado = signal(this.leerColapsado());
  /** Móvil/tablet: panel lateral abierto. */
  readonly menuMovil = signal(false);
  readonly menuUsuario = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Título de la barra superior según el módulo activo (primer segmento de la URL). */
  readonly tituloActual = computed(() => {
    const segmento = this.url().split(/[?#]/)[0].split('/')[1];
    const modulo = this.modulos.find((m) => m.ruta?.split('/')[1] === segmento);
    return modulo?.nombre ?? 'SIGIF-Drones';
  });

  readonly nombre = computed(() => this.auth.profile()?.nombre_completo || 'Usuario');
  readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());

  constructor() {
    // Al navegar, se cierran el panel móvil y el menú de usuario
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuMovil.set(false);
        this.menuUsuario.set(false);
      });

    // Con el panel móvil abierto, la página de fondo no hace scroll
    effect((onCleanup) => {
      if (this.menuMovil()) {
        document.body.style.overflow = 'hidden';
        onCleanup(() => (document.body.style.overflow = ''));
      }
    });
  }

  abrirMenuMovil(): void {
    this.menuMovil.set(true);
  }

  cerrarMenuMovil(): void {
    this.menuMovil.set(false);
  }

  alternarColapso(): void {
    const nuevo = !this.colapsado();
    this.colapsado.set(nuevo);
    try {
      localStorage.setItem(CLAVE_COLAPSADO, nuevo ? '1' : '0');
    } catch {
      // Sin almacenamiento disponible: el estado vale solo para esta sesión
    }
  }

  alternarMenuUsuario(): void {
    this.menuUsuario.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.menuMovil.set(false);
    this.menuUsuario.set(false);
  }

  /** Clic fuera del menú de usuario lo cierra. */
  @HostListener('document:click', ['$event'])
  cerrarMenuUsuarioFuera(evento: MouseEvent): void {
    if (this.menuUsuario() && !(evento.target as HTMLElement).closest('.user-menu')) {
      this.menuUsuario.set(false);
    }
  }

  /** Si se agranda la ventana con el panel móvil abierto, se cierra. */
  @HostListener('window:resize')
  alCambiarTamano(): void {
    if (window.innerWidth >= ANCHO_ESCRITORIO && this.menuMovil()) {
      this.menuMovil.set(false);
    }
  }

  async salir(): Promise<void> {
    this.menuUsuario.set(false);
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

  private leerColapsado(): boolean {
    try {
      return localStorage.getItem(CLAVE_COLAPSADO) === '1';
    } catch {
      return false;
    }
  }
}