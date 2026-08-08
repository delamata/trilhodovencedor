import { AlertTriangle, CalendarCheck, GraduationCap, OctagonAlert, TrendingUp, TriangleAlert, UserCheck, Users, XCircle } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { PresenceByClassChart } from './presence-by-class-chart';
import { SituacaoDistributionChart } from './situacao-distribution-chart';
import type { AdminDashboardData } from './actions';

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { metrics, presenceByClass } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground lg:text-2xl">Painel administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral dos cursos, alunos e presença do Trilho do Vencedor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Alunos ativos" value={metrics.totalActiveStudents} icon={Users} />
        <MetricCard label="Maturidade" value={metrics.maturidadeStudents} icon={GraduationCap} />
        <MetricCard label="CTL" value={metrics.ctlStudents} icon={GraduationCap} />
        <MetricCard label="Presença média" value={`${metrics.averageAttendancePct}%`} icon={TrendingUp} />
        <MetricCard label="Total de faltas" value={metrics.totalAbsences} icon={XCircle} />
        <MetricCard label="Aulas com registro" value={metrics.totalClassesRecorded > 0 ? presenceByClass.length : 0} icon={CalendarCheck} />
        <MetricCard label="Em atenção" value={metrics.atencaoCount} icon={AlertTriangle} tone="warning" />
        <MetricCard label="Em alerta" value={metrics.alertaCount} icon={TriangleAlert} tone="warning" />
        <MetricCard label="No limite" value={metrics.limiteAtingidoCount} icon={UserCheck} tone="warning" />
        <MetricCard label="Limite excedido" value={metrics.limiteExcedidoCount} icon={OctagonAlert} tone="critical" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Presença por aula
            <span className="ml-2 text-xs font-normal text-muted-foreground">últimas aulas finalizadas</span>
          </h2>
          <PresenceByClassChart data={presenceByClass} />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Distribuição por situação</h2>
          <SituacaoDistributionChart data={metrics.situacaoDistribution} />
        </section>
      </div>
    </div>
  );
}
