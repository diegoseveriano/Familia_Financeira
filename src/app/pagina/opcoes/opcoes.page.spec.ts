import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpcoesPage } from './opcoes.page';

describe('OpcoesPage', () => {
  let component: OpcoesPage;
  let fixture: ComponentFixture<OpcoesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OpcoesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
