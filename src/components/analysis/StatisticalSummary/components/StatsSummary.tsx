import React from 'react';
import { Calculator, TrendingUp, Hash, Sigma } from 'lucide-react';
import type { DataField } from '@/types/data';
import { calculateDatasetStats } from '@/utils/analysis/statistics/calculations';
import { formatNumber } from '@/utils/analysis/statistics/formatting';

interface StatsSummaryProps {
  fields: DataField[];
}

export function StatsSummary({ fields }: StatsSummaryProps) {
  const numericFields = fields.filter(f => f.type === 'number');
  const stats = calculateDatasetStats(numericFields);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Fields"
        value={fields.length.toString()}
        icon={<Calculator className="w-5 h-5 text-indigo-600" />}
      />
      <SummaryCard
        title="Average Mean"
        value={formatNumber(stats.averageMean)}
        icon={<Hash className="w-5 h-5 text-green-600" />}
      />
      <SummaryCard
        title="Overall Variance"
        value={formatNumber(stats.overallVariance)}
        icon={<Sigma className="w-5 h-5 text-blue-600" />}
      />
      <SummaryCard
        title="Trend Strength"
        value={`${(stats.trendStrength * 100).toFixed(1)}%`}
        icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
      />
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function SummaryCard({ title, value, icon }: SummaryCardProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-medium text-black-500">{title}</h4>
      </div>
      <p className="text-2xl font-semibold text-black-500">{value}</p>
    </div>
  );
}