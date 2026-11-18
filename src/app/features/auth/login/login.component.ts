import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    // 1. Desestructuramos las tres propiedades que devuelve AuthService
    const { error, rol, sinPerfil } = await this.auth.iniciarSesion(email, password);

    this.cargando.set(false);

    // 2. Evaluamos si el usuario no tiene perfil asignado
    if (sinPerfil) {
      this.error.set('Su usuario no tiene un perfil con rol asignado. Contacte al administrador.');
      return;
    }

    // 3. Evaluamos si hubo error de credenciales
    if (error) {
      this.error.set('Correo o contraseña incorrectos.');
      return;
    }

    // 4. Redirigimos según el rol obtenido
    this.router.navigateByUrl('/');
  }
}