import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ShellComponent } from './layout/shell/shell.component';
import { AsignacionMisionComponent } from './features/misiones/asignacion-mision/asignacion-mision.component';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: 'misiones/asignacion',
        component: AsignacionMisionComponent,
        canActivate: [roleGuard(['coordinador'])],
      },
      { path: '', redirectTo: 'misiones/asignacion', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];