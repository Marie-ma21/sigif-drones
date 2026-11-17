// import { Routes } from '@angular/router';
// import { LoginComponent } from './features/auth/login/login.component';
// import { ShellComponent } from './layout/shell/shell.component';
// import { AsignacionMisionComponent } from './features/misiones/asignacion-mision/asignacion-mision.component';
// import { roleGuard } from './core/guards/role.guard';

// export const routes: Routes = [
//   { path: 'login', component: LoginComponent },

//   {
//     path: '',
//     component: ShellComponent,
//     children: [
//       {
//         path: 'misiones/asignacion',
//         component: AsignacionMisionComponent,
//         canActivate: [roleGuard(['coordinador'])],
//       },
//       { path: '', redirectTo: 'misiones/asignacion', pathMatch: 'full' },
//     ],
//   },

//   { path: '**', redirectTo: 'login' },
// ];

import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { ShellComponent } from './layout/shell/shell.component';
import { AsignacionMisionComponent } from './features/misiones/asignacion-mision/asignacion-mision.component';
import { SolicitudOperadorComponent } from './features/misiones/solicitud-operador/solicitud-operador';
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
      {
        path: 'operador/solicitar-mision',
        canActivate: [roleGuard(['operador'])],
        loadComponent: () =>
          import('./features/misiones/solicitud-operador/solicitud-operador').then((m) => m.SolicitudOperadorComponent),
      },
      {
        path: 'misiones/mis-solicitudes',
        canActivate: [roleGuard(['operador'])],
        loadComponent: () =>
          import('./features/misiones/mis-solicitudes/mis-solicitudes.component').then((m) => m.MisSolicitudesComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: 'login' },
];