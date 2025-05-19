import { DollarSign, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RatioAnalysis } from './RatioAnalysis';
import { BreakEven } from './BreakEven';
import { Attribution } from './Attribution';
import CustomerSegmentation from './CustomerSegmentation';
import { DemandForecasting } from './DemandForecasting';
import { ROIAnalysis } from './ROIAnalysis';
import { RouteOptimization } from './RouteOptimization';
import { InventoryOptimization } from './InventoryOptimization';
import { FinancialModeling } from './FinancialModeling';
import type { DataField } from '@/types/data';
import { useState, useEffect } from 'react';

interface BusinessMetricsProps {
  data: {
    fields: DataField[];
  };
}

interface AnalysisResult {
  category: string;
  metrics: {
    name: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
    icon?: JSX.Element;
  }[];
  insights: string[];
}

export function BusinessMetrics({ data }: BusinessMetricsProps) {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper function to parse metric values
  const parseMetricValue = (value: string): number | null => {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  };

  // Helper function to determine trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    const analyzeData = async () => {
      setIsAnalyzing(true);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results: AnalysisResult[] = [];
      
      // Check if we have CSV-style data (array of objects with metric names as keys)
      if (data.fields.length > 0 && typeof data.fields[0] === 'object' && !data.fields[0].hasOwnProperty('name')) {
        // This is CSV-style data where each row is an object with metric columns
        const csvData = data.fields as Record<string, any>[];
        
        // Calculate averages for each metric across all rows
        const metricSums: Record<string, number> = {};
        const metricCounts: Record<string, number> = {};
        
        csvData.forEach(row => {
          Object.entries(row).forEach(([metricName, value]) => {
            if (typeof value === 'string' && value.includes('%')) {
              const numValue = parseMetricValue(value);
              if (numValue !== null) {
                metricSums[metricName] = (metricSums[metricName] || 0) + numValue;
                metricCounts[metricName] = (metricCounts[metricName] || 0) + 1;
              }
            } else if (typeof value === 'number') {
              metricSums[metricName] = (metricSums[metricName] || 0) + value;
              metricCounts[metricName] = (metricCounts[metricName] || 0) + 1;
            }
          });
        });
        
        const financialMetrics = [];
        const financialInsights: string[] = [];
        
        // Process key financial metrics
        if (metricSums['Revenue Growth'] && metricCounts['Revenue Growth']) {
          const avgValue = metricSums['Revenue Growth'] / metricCounts['Revenue Growth'];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgValue > 15) trend = 'up';
          else if (avgValue < 5) trend = 'down';
          
          financialMetrics.push({
            name: 'Revenue Growth',
            value: `${avgValue.toFixed(1)}%`,
            change: avgValue,
            trend,
            icon: <TrendingUp className="w-5 h-5 text-blue-500" />
          });
          
          if (avgValue > 10) {
            financialInsights.push(`Average revenue growth of ${avgValue.toFixed(1)}% indicates healthy business expansion`);
          } else if (avgValue < 5) {
            financialInsights.push(`Low average revenue growth (${avgValue.toFixed(1)}%) may require strategy review`);
          }
        }
        
        if (metricSums['Profit Margin'] && metricCounts['Profit Margin']) {
          const avgValue = metricSums['Profit Margin'] / metricCounts['Profit Margin'];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgValue > 20) trend = 'up';
          else if (avgValue < 10) trend = 'down';
          
          financialMetrics.push({
            name: 'Profit Margin',
            value: `${avgValue.toFixed(1)}%`,
            change: avgValue,
            trend,
            icon: <DollarSign className="w-5 h-5 text-green-500" />
          });
          
          if (avgValue > 15) {
            financialInsights.push(`High average profit margin of ${avgValue.toFixed(1)}% indicates strong pricing power or cost control`);
          } else if (avgValue < 10) {
            financialInsights.push(`Low average profit margin (${avgValue.toFixed(1)}%) may indicate pricing or cost issues`);
          }
        }
        
        if (metricSums['Operating Efficiency'] && metricCounts['Operating Efficiency']) {
          const avgValue = metricSums['Operating Efficiency'] / metricCounts['Operating Efficiency'];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgValue > 80) trend = 'up';
          else if (avgValue < 60) trend = 'down';
          
          financialMetrics.push({
            name: 'Operating Efficiency',
            value: `${avgValue.toFixed(0)}%`,
            change: avgValue,
            trend,
            icon: <Activity className="w-5 h-5 text-purple-500" />
          });
          
          if (avgValue > 75) {
            financialInsights.push(`High average operating efficiency (${avgValue.toFixed(0)}%) suggests effective resource utilization`);
          } else if (avgValue < 60) {
            financialInsights.push(`Low average operating efficiency (${avgValue.toFixed(0)}%) may indicate operational inefficiencies`);
          }
        }
        
        // Add customer metrics if available
        const customerMetrics = [];
        const customerInsights: string[] = [];
        
        if (metricSums['Customer Retention'] && metricCounts['Customer Retention']) {
          const avgValue = metricSums['Customer Retention'] / metricCounts['Customer Retention'];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgValue > 85) trend = 'up';
          else if (avgValue < 70) trend = 'down';
          
          customerMetrics.push({
            name: 'Customer Retention',
            value: `${avgValue.toFixed(1)}%`,
            change: avgValue,
            trend,
            icon: <Activity className="w-5 h-5 text-blue-500" />
          });
          
          if (avgValue > 80) {
            customerInsights.push(`Strong customer retention (${avgValue.toFixed(1)}%) indicates good customer satisfaction`);
          } else if (avgValue < 70) {
            customerInsights.push(`Customer retention (${avgValue.toFixed(1)}%) could be improved with better engagement`);
          }
        }
        
        if (metricSums['Conversion Rate'] && metricCounts['Conversion Rate']) {
          const avgValue = metricSums['Conversion Rate'] / metricCounts['Conversion Rate'];
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (avgValue > 8) trend = 'up';
          else if (avgValue < 3) trend = 'down';
          
          customerMetrics.push({
            name: 'Conversion Rate',
            value: `${avgValue.toFixed(1)}%`,
            change: avgValue,
            trend,
            icon: <TrendingUp className="w-5 h-5 text-green-500" />
          });
        }
        
        if (financialMetrics.length > 0) {
          results.push({
            category: 'Financial',
            metrics: financialMetrics,
            insights: financialInsights.length > 0 
              ? financialInsights 
              : ['Financial metrics show stable performance across key indicators']
          });
        }
        
        if (customerMetrics.length > 0) {
          results.push({
            category: 'Customer',
            metrics: customerMetrics,
            insights: customerInsights.length > 0 
              ? customerInsights 
              : ['Customer metrics show typical performance patterns']
          });
        }
      } else {
        // Parse the data structure shown in the image (name-value pairs)
        const parsedMetrics: Record<string, string> = {};
        let currentMetric = '';
        
        data.fields.forEach(field => {
          const fieldName = field.name.trim();
          const fieldValue = field.value?.toString().trim() || '';
          
          // If the field looks like a metric name (contains letters)
          if (/[a-zA-Z]/.test(fieldName) && !/\d/.test(fieldName)) {
            currentMetric = fieldName;
          } 
          // If the field looks like a value (contains numbers)
          else if (currentMetric && /[\d.%]/.test(fieldValue)) {
            parsedMetrics[currentMetric] = fieldValue;
            currentMetric = ''; // Reset for next pair
          }
        });

        // Financial Analysis
        const financialMetrics = [];
        const financialInsights: string[] = [];
        
        // Revenue Growth
        if (parsedMetrics['Revenue Growth']) {
          const value = parseMetricValue(parsedMetrics['Revenue Growth']);
          if (value !== null) {
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (value > 15) trend = 'up';
            else if (value < 5) trend = 'down';
            
            financialMetrics.push({
              name: 'Revenue Growth',
              value: `${value.toFixed(1)}%`,
              change: value,
              trend,
              icon: <TrendingUp className="w-5 h-5 text-blue-500" />
            });
            
            if (value > 10) {
              financialInsights.push(`Strong revenue growth (${value.toFixed(1)}%) indicates healthy business expansion`);
            } else if (value < 5) {
              financialInsights.push(`Low revenue growth (${value.toFixed(1)}%) may require strategy review`);
            }
          }
        }
        
        // Profit Margin
        if (parsedMetrics['Profit Margin']) {
          const value = parseMetricValue(parsedMetrics['Profit Margin']);
          if (value !== null) {
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (value > 20) trend = 'up';
            else if (value < 10) trend = 'down';
            
            financialMetrics.push({
              name: 'Profit Margin',
              value: `${value.toFixed(1)}%`,
              change: value,
              trend,
              icon: <DollarSign className="w-5 h-5 text-green-500" />
            });
            
            if (value > 15) {
              financialInsights.push(`High profit margin (${value.toFixed(1)}%) indicates strong pricing power or cost control`);
            } else if (value < 10) {
              financialInsights.push(`Low profit margin (${value.toFixed(1)}%) may indicate pricing or cost issues`);
            }
          }
        }
        
        // Operating Efficiency
        if (parsedMetrics['Operating Efficiency']) {
          const value = parseMetricValue(parsedMetrics['Operating Efficiency']);
          if (value !== null) {
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (value > 80) trend = 'up';
            else if (value < 60) trend = 'down';
            
            financialMetrics.push({
              name: 'Operating Efficiency',
              value: `${value.toFixed(0)}%`,
              change: value,
              trend,
              icon: <Activity className="w-5 h-5 text-purple-500" />
            });
            
            if (value > 75) {
              financialInsights.push(`High operating efficiency (${value.toFixed(0)}%) suggests effective resource utilization`);
            } else if (value < 60) {
              financialInsights.push(`Low operating efficiency (${value.toFixed(0)}%) may indicate operational inefficiencies`);
            }
          }
        }
        
        // Handle any remaining unclassified percentage values
        Object.entries(parsedMetrics).forEach(([name, valueStr]) => {
          if (!['Revenue Growth', 'Profit Margin', 'Operating Efficiency'].includes(name)) {
            const value = parseMetricValue(valueStr);
            if (value !== null && valueStr.includes('%')) {
              financialMetrics.push({
                name,
                value: `${value.toFixed(1)}%`,
                change: value,
                trend: 'stable',
                icon: <Activity className="w-5 h-5 text-gray-500" />
              });
            }
          }
        });
        
        if (financialMetrics.length > 0) {
          results.push({
            category: 'Financial',
            metrics: financialMetrics,
            insights: financialInsights.length > 0 
              ? financialInsights 
              : ['Financial metrics show stable performance across key indicators']
          });
        }
      }
      
      setAnalysisResults(results);
      setIsAnalyzing(false);
    };
    
    analyzeData();
  }, [data]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-teal-500" />
        <h3 className="text-lg font-semibold text-black">Business Metrics Analysis</h3>
      </div>

      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Analyzing business data...</p>
        </div>
      ) : (
        <>
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
              <TabsTrigger value="financial" className="text-black">Financial</TabsTrigger>
              <TabsTrigger value="operations" className="text-black">Operations</TabsTrigger>
              <TabsTrigger value="customer" className="text-black">Customer</TabsTrigger>
              <TabsTrigger value="inventory" className="text-black">Inventory</TabsTrigger>
              <TabsTrigger value="optimization" className="text-black">Optimization</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="space-y-4">
              {analysisResults.find(r => r.category === 'Financial') ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysisResults.find(r => r.category === 'Financial')?.metrics.map((metric, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {metric.icon}
                            <h4 className="font-medium text-gray-700">{metric.name}</h4>
                          </div>
                          {metric.trend && (
                            <span className={`flex items-center text-xs px-2 py-1 rounded-full ${
                              metric.trend === 'up' ? 'bg-green-100 text-green-800' : 
                              metric.trend === 'down' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getTrendIcon(metric.trend)}
                              {metric.change && ` ${Math.abs(metric.change).toFixed(1)}%`}
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-teal-600 mt-2">{metric.value}</p>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-teal-500" />
                    <h4 className="font-medium text-black">Key Insights</h4>
                  </div>
                  <ul className="space-y-2">
                    {analysisResults.find(r => r.category === 'Financial')?.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-teal-500 mt-1">•</span>
                        <span className="text-gray-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-gray-500">No financial data available for analysis</p>
              )}
              <RatioAnalysis data={data} />
              <BreakEven data={data} />
              <ROIAnalysis data={data} />
              <FinancialModeling data={data} />
            </TabsContent>

            <TabsContent value="operations" className="space-y-4">
              <RouteOptimization data={data} />
              <Attribution data={data} />
            </TabsContent>

            <TabsContent value="customer" className="space-y-4">
              <CustomerSegmentation data={data} />
              <DemandForecasting data={data} />
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <InventoryOptimization data={data} />
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4">
              <RouteOptimization data={data} />
              <InventoryOptimization data={data} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 