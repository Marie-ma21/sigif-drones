import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudOperador } from './solicitud-operador';

describe('SolicitudOperador', () => {
  let component: SolicitudOperador;
  let fixture: ComponentFixture<SolicitudOperador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudOperador],
    }).compileComponents();

    fixture = TestBed.createComponent(SolicitudOperador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
