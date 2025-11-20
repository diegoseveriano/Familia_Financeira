import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { IonicModule, AlertController, ToastController, NavController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { GastosService, Gasto } from '../../services/gastos.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-gastos',
  standalone: true,
  template: `
  <ion-header [translucent]="true">
    <ion-toolbar color="tertiary">
      <ion-buttons slot="start">
        <ion-back-button defaultHref="/home"></ion-back-button>
      </ion-buttons>
      <ion-title>Gastos</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true" class="gastos-content ion-padding">

    <div class="top-row">
      <ion-card class="card-resumo">
        <ion-card-header>
          <ion-card-title>Resumo do Mês</ion-card-title>
          <ion-card-subtitle>{{ mesAtual | titlecase }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="resumo-inner">
            <div class="resumo-info">
              <div class="label-small">Total</div>
              <div class="total-valor">{{ formatCurrency(totalMesAtual) }}</div>
              <div class="muted small">Categorias e participação</div>
            </div>

            <div class="resumo-chart">
              <div class="chart-wrapper">
                <canvas #gastosChart></canvas>
              </div>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="card-acoes">
        <ion-card-header>
          <ion-card-title>Adicionar Rápido</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row class="ion-align-items-center">
              <ion-col size="8">
                <ion-item class="input-quick">
                  <ion-input
                    type="number"
                    placeholder="Valor (ex: 25.50)"
                    [(ngModel)]="quickValor"
                    inputmode="decimal"
                    min="0"
                  ></ion-input>
                </ion-item>
              </ion-col>
              <ion-col size="4">
                <ion-button expand="block" color="primary" (click)="adicionarRapido()">Adicionar</ion-button>
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col>
                <ion-button expand="block" fill="clear" (click)="abrirAlertDetalhado()">
                  + Adicionar detalhado
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </div>

    <div class="lista-gastos">
      <h3 class="section-title">Últimos Gastos</h3>

      <ion-list *ngIf="(ultimos?.length || 0) > 0; else semGastos">
        <ion-item
          *ngFor="let g of ultimos"
          class="gasto-item"
          lines="none"
          [style.--border-start-color]="getCategoriaColor(g.categoria)"
        >
          <div class="left-thumb" [style.background]="getCategoriaColor(g.categoria)"></div>
          <ion-label class="gasto-label">
            <div class="gasto-desc">{{ g.descricao }}</div>
            <div class="muted gasto-meta">{{ g.categoria }} • {{ g.criadoEm | date:'dd/MM/yyyy' }}</div>
          </ion-label>

          <div class="gasto-right">
            <div class="gasto-valor">{{ formatCurrency(g.valor) }}</div>
            <ion-button fill="clear" color="danger" size="small" (click)="confirmarRemocao(g)">Remover</ion-button>
          </div>
        </ion-item>
      </ion-list>

      <ng-template #semGastos>
        <div class="sem-gastos">
          <p class="muted">Nenhum gasto adicionado ainda.</p>
          <ion-button fill="outline" (click)="abrirAlertDetalhado()">Adicionar primeiro gasto</ion-button>
        </div>
      </ng-template>
    </div>

  </ion-content>
  `,
  styles: [`
    .gastos-content {
      --ion-background-color: var(--ion-color-light);
      background: linear-gradient(180deg, #fcf9ff 0%, #f8f6ff 100%);
      min-height: 100vh;
    }

    .top-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    @media (min-width: 720px) {
      .top-row { grid-template-columns: 2fr 1fr; align-items: start; }
    }

    ion-card {
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(99, 57, 135, 0.08);
      overflow: hidden;
      transition: transform .18s ease, box-shadow .18s ease;
      background: linear-gradient(180deg, #fff, #fbf7ff);
    }

    .resumo-inner {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 8px 0;
    }
    .resumo-info { flex: 1; }
    .label-small { font-size: 0.85rem; color: var(--ion-color-medium); }
    .total-valor { font-size: 1.6rem; font-weight: 700; color: var(--ion-color-tertiary); margin: 6px 0; }
    .resumo-chart { width: 160px; height: 120px; }
    .chart-wrapper { width: 100%; height: 100%; position: relative; }
    .chart-wrapper canvas { width: 100% !important; height: 100% !important; }

    .card-acoes { display:flex; flex-direction:column; justify-content:center; }
    ion-item.input-quick { --padding-start:8px; border-radius:8px; background:#fff; box-shadow: inset 0 1px 0 rgba(0,0,0,0.02); }

    .lista-gastos .section-title { margin: 8px 0 6px; font-size: 1rem; color: var(--ion-color-dark); }

    ion-list { display: grid; gap: 10px; }

    .gasto-item {
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, #fff, #fcf9ff);
      border-radius: 12px; padding: 10px;
      box-shadow: 0 6px 20px rgba(99,57,135,0.05);
      transition: transform .15s ease, box-shadow .15s ease;
      border-left: 6px solid transparent;
      overflow: hidden;
    }
    .gasto-item:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(99,57,135,0.08); }

    .left-thumb { width:44px; height:44px; border-radius:10px; flex-shrink:0; box-shadow:0 6px 18px rgba(99,57,135,0.06); }
    .gasto-label { flex:1; }
    .gasto-desc { font-weight:700; color:var(--ion-color-dark); }
    .gasto-meta { font-size:0.85rem; color:var(--ion-color-medium); margin-top:4px; }

    .gasto-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .gasto-valor { font-weight:700; color:var(--ion-color-dark); }
    .sem-gastos { text-align:center; padding:18px 6px; color:var(--ion-color-medium); }

    .muted { color: var(--ion-color-medium); }
  `],
  imports: [IonicModule, CommonModule, FormsModule, RouterModule] 
})
export class GastosPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gastosChart', { static: false }) gastosChart!: ElementRef<HTMLCanvasElement>;
  public chart?: Chart;

  public gastos: Gasto[] = [];
  public categorias: string[] = []; 
  public quickValor: number | null = null;
  public mesAtual: string = '';
  public totalMesAtual: number = 0;
  public ultimos: Gasto[] = [];

  private gastosService = inject(GastosService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController); 
  
  private gastosSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
    this.categorias = this.gastosService.getCategoriasList();
    this.subscribeToGastos(); 
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => this.renderChart(), 200);
  }

  ngOnDestroy(): void {
    if (this.gastosSubscription) {
        this.gastosSubscription.unsubscribe();
    }
  }

  private subscribeToGastos(): void {
    this.gastosSubscription = this.gastosService.gastos$.subscribe(gastos => {
      this.gastos = gastos; 
      this.atualizarResumo();
      this.updateChart(); 
    });
  }
  
  private atualizarResumo(): void {
    this.totalMesAtual = this.gastosService.totalForMonth();
    this.ultimos = this.gastos.slice().sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()).slice(0, 8);
  }

  public abrirAlertDetalhado(): void {
    this.abrirAlertAdicionar();
  }

  public formatCurrency(v: number): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  public getCategoriaColor(categoria: string): string {
    return this.gastosService.getCategoriaColor(categoria) || '#c5cae9';
  }

  public async confirmarRemocao(gasto: Gasto): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirmar Remoção',
      message: `Tem certeza que deseja excluir o gasto de ${this.formatCurrency(gasto.valor)} (${gasto.descricao})?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Excluir', 
          handler: async () => {
             if (gasto.id) {
                await this.gastosService.deleteGasto(gasto.id);
                this.showToast('Gasto removido com sucesso!', 'medium');
             } else {
                 this.showToast('Erro: ID do gasto não encontrado.', 'danger');
             }
          } 
        }
      ]
    });
    await alert.present();
  }

  public async adicionarRapido(): Promise<void> {
    const valor = Number(this.quickValor);
    if (isNaN(valor) || valor <= 0) {
      await this.showToast('Digite um valor válido maior que zero.', 'danger');
      return;
    }

    try {
        await this.gastosService.addGasto({
          descricao: 'Gasto Rápido',
          valor: valor,
          categoria: 'Outros',
          criadoEm: new Date()
        });
        this.quickValor = null;
        await this.showToast('Gasto rápido adicionado!', 'success');
    } catch (e) {
        console.error('Erro ao adicionar gasto rápido:', e);
        await this.showToast('Erro ao adicionar gasto.', 'danger');
    }
  }

  public async abrirAlertAdicionar(): Promise<void> {
    const alert1 = await this.alertController.create({
      header: 'Adicionar Gasto',
      inputs: [
        { name: 'descricao', type: 'text', placeholder: 'Descrição (ex: Supermercado)' },
        { name: 'valor', type: 'number', placeholder: 'Valor (ex: 25.50)', attributes: { step: '0.01' } }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Próximo',
          handler: (data: any) => {
            const descricao = String(data.descricao ?? '').trim();
            const valor = Number(data.valor);
            if (!descricao || isNaN(valor) || valor <= 0) {
              this.showToast('Preencha a descrição e valor corretamente.', 'danger');
              return false;
            }
            setTimeout(() => this._abrirAlertSelecionarCategoria({ descricao, valor }), 50);
            return true;
          }
        }
      ]
    });

    await alert1.present();
  }

  private async _abrirAlertSelecionarCategoria(base: { descricao: string; valor: number }) {
    const radioInputs = this.categorias.map(c => ({
      type: 'radio' as const,
      label: c,
      value: c,
      checked: c === 'Alimentação' 
    }));

    const alert = await this.alertController.create({
      header: 'Categoria',
      inputs: radioInputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar',
          handler: async (selectedCategoria: string) => {
            const categoria = selectedCategoria ?? 'Outros';
            try {
                await this.gastosService.addGasto({
                  descricao: base.descricao,
                  valor: base.valor,
                  categoria: categoria,
                  criadoEm: new Date()
                });
                this.showToast('Gasto detalhado adicionado!', 'success');
            } catch (e) {
                console.error('Erro ao adicionar gasto detalhado:', e);
                this.showToast('Erro ao adicionar gasto detalhado.', 'danger');
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }
  
  private async showToast(msg: string, color: string, dur = 1400) {
    const t = await this.toastController.create({ message: msg, duration: dur, position: 'bottom', color: color });
    await t.present();
  }

  private renderChart(): void {
    const ctx = this.gastosChart?.nativeElement?.getContext('2d');
    if (!ctx) return;

    const porCat = this.gastosService.totalsByCategoryForMonth();
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(l => this.gastosService.getCategoriaColor(l) || '#c5cae9'),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
        },
        maintainAspectRatio: false,
        responsive: true
      }
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      setTimeout(() => this.renderChart(), 80);
      return;
    }

    const porCat = this.gastosService.totalsByCategoryForMonth();
    const labels = Object.keys(porCat);
    const values = Object.values(porCat);

    if (values.every(v => v === 0) && this.chart) {
        this.chart.destroy();
        this.chart = undefined;
        this.renderChart();
        return;
    }

    this.chart.data.labels = labels;
    (this.chart.data.datasets[0] as any).data = values;
    (this.chart.data.datasets[0] as any).backgroundColor = labels.map(l => this.gastosService.getCategoriaColor(l) || '#c5cae9');
    this.chart.update();
  }
}