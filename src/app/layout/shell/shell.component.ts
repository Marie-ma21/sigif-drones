import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
  ruta?: string;
  etiqueta?: string;
  icono: string;
}

const ANCHO_ESCRITORIO = 1024;
const CLAVE_COLAPSADO = 'shell.sidebar.colapsado';
const CLAVE_AVISO = 'shell.aviso.modulos';

/**
 * Módulos del menú.
 */
const MODULOS: Modulo[] = [
  {
    nombre: 'Rutas',
    etiqueta: 'Pronto',
    icono: 'M8 18h7a3 3 0 000-6H9a3 3 0 010-6h7 M6 20a2 2 0 100-4 2 2 0 000 4z M18 8a2 2 0 100-4 2 2 0 000 4z',
  },
  {
    nombre: 'Misiones',
    icono: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  },
  {
    nombre: 'Control',
    etiqueta: 'Pronto',
    icono: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4',
  },
  {
    nombre: 'Telemetría',
    etiqueta: 'Pronto',
    icono: 'M3 12h4l3-8 4 16 3-8h4',
  },
  {
    nombre: 'Mantenimiento',
    etiqueta: 'Pronto',
    icono:
      'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  },
];

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

  /**
   * Misiones lleva a una pantalla distinta según el rol. Sin sesión, o con un rol
   * que no tiene pantalla de misiones, el ítem queda deshabilitado.
   */
  private readonly rutaMisiones = computed(() => {
    switch (this.auth.profile()?.rol) {
      case 'coordinador':
        return '/misiones/asignacion';
      case 'operador':
        return '/misiones/mis-solicitudes';
      default:
        return undefined;
    }
  });

  readonly modulos = computed<Modulo[]>(() =>
    MODULOS.map((m) => {
      if (m.nombre !== 'Misiones') return m;
      const ruta = this.rutaMisiones();
      if (ruta) return { ...m, ruta };
      return { ...m, etiqueta: this.auth.profile() ? 'Sin acceso' : 'Inicia sesión' };
    }),
  );

  readonly colapsado = signal(this.leerColapsado());
  readonly menuMovil = signal(false);
  readonly menuUsuario = signal(false);

  readonly textoPendientes = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(
    MODULOS.filter((m) => m.etiqueta).map((m) => m.nombre),
  );
  private readonly avisoCerrado = signal(this.avisoYaVisto());
  readonly avisoModulos = computed(() => !!this.auth.profile() && !this.avisoCerrado());

  @ViewChild('botonAviso')
  set botonAviso(ref: ElementRef<HTMLButtonElement> | undefined) {
    ref?.nativeElement.focus();
  }

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly tituloActual = computed(() => {
    const segmento = this.url().split(/[?#]/)[0].split('/')[1];
    if (!segmento) return 'Inicio';
    if (segmento === 'misiones' || segmento === 'operador') return 'Misiones';
    return 'SIGIF-Drones';
  });

  readonly nombre = computed(() => this.auth.profile()?.nombre_completo || 'Usuario');
  readonly inicial = computed(() => this.nombre().charAt(0).toUpperCase());

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuMovil.set(false);
        this.menuUsuario.set(false);
      });

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
    }
  }

  cerrarAviso(): void {
    this.avisoCerrado.set(true);
    try {
      sessionStorage.setItem(CLAVE_AVISO, '1');
    } catch {
    }
  }

  alternarMenuUsuario(): void {
    this.menuUsuario.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.avisoModulos()) this.cerrarAviso();
    this.menuMovil.set(false);
    this.menuUsuario.set(false);
  }

  @HostListener('document:click', ['$event'])
  cerrarMenuUsuarioFuera(evento: MouseEvent): void {
    if (this.menuUsuario() && !(evento.target as HTMLElement).closest('.user-menu')) {
      this.menuUsuario.set(false);
    }
  }

  @HostListener('window:resize')
  alCambiarTamano(): void {
    if (window.innerWidth >= ANCHO_ESCRITORIO && this.menuMovil()) {
      this.menuMovil.set(false);
    }
  }

  async salir(): Promise<void> {
    this.menuUsuario.set(false);
    try {
      sessionStorage.removeItem(CLAVE_AVISO); // el próximo ingreso vuelve a mostrar el aviso
    } catch {
    }
    this.avisoCerrado.set(false);
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

  private avisoYaVisto(): boolean {
    try {
      return sessionStorage.getItem(CLAVE_AVISO) === '1';
    } catch {
      return false;
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