import { DataField } from '@/types/data';
import { createError } from '@/utils/core/error';
import { NetworkAnalysis } from '../network/NetworkAnalysis';

export class AnalysisEngine {
  private fields: DataField[];
  private networkAnalysis: NetworkAnalysis;

  constructor(fields: DataField[]) {
    this.fields = fields;
    this.networkAnalysis = new NetworkAnalysis(fields);
    this.validateFields();
  }

  private validateFields() {
    if (!this.fields?.length) {
      throw createError('VALIDATION_ERROR', 'No fields provided for analysis');
    }

    const invalidFields = this.fields.filter(field => 
      !field.name || !field.type || !Array.isArray(field.value)
    );

    if (invalidFields.length > 0) {
      throw createError(
        'VALIDATION_ERROR',
        `Invalid fields found: ${invalidFields.map(f => f.name).join(', ')}`
      );
    }
  }

  async analyze(category?: string) {
    try {
      const numericFields = this.fields.filter(f => f.type === 'number');
      
      if (category === 'descriptive') {
        return {
          statistics: {
            descriptive: this.calculateDescriptiveStats(numericFields)
          }
        };
      }
      
      if (category === 'correlation') {
        return {
          statistics: {
            correlations: this.calculateCorrelations(numericFields)
          }
        };
      }
      
      if (category === 'hypothesis') {
        return {
          hypothesisTests: this.performHypothesisTests(numericFields)
        };
      }
      
      if (category === 'network') {
        return {
          networkAnalysis: this.networkAnalysis.analyze()
        };
      }
      
      // Default analysis includes all
      return {
        statistics: {
          descriptive: this.calculateDescriptiveStats(numericFields),
          correlations: this.calculateCorrelations(numericFields)
        },
        hypothesisTests: this.performHypothesisTests(numericFields),
        networkAnalysis: this.networkAnalysis.analyze()
      };
    } catch (error) {
      throw createError('ANALYSIS_ERROR', error instanceof Error ? error.message : 'Analysis failed');
    }
  }

  private calculateDescriptiveStats(fields: DataField[]) {
    const stats: Record<string, any> = {};
    
    fields.forEach(field => {
      const values = field.value as number[];
      
      if (!values || values.length === 0) {
        throw createError('VALIDATION_ERROR', `Field ${field.name} has no valid data`);
      }
      
      if (!values.every(v => typeof v === 'number' && !isNaN(v))) {
        throw createError('VALIDATION_ERROR', `Field ${field.name} contains non-numeric values`);
      }

      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      
      // Sort values for median and quartiles
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      // Calculate standard deviation
      const squaredDiffs = values.map(x => Math.pow(x - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      stats[field.name] = {
        mean,
        median,
        standardDeviation: stdDev,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });
    
    return stats;
  }

  private calculateCorrelations(fields: DataField[]) {
    const correlations: Record<string, number> = {};
    
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        const values1 = field1.value as number[];
        const values2 = field2.value as number[];
        
        const correlation = this.calculatePearsonCorrelation(values1, values2);
        correlations[`${field1.name}_${field2.name}`] = correlation;
      }
    }
    
    return correlations;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private performHypothesisTests(fields: DataField[]) {
    if (fields.length < 2) {
      return [];
    }

    const tests = [];
    
    // Perform t-test for each pair of fields
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        const result = this.performTTest(
          field1.value as number[],
          field2.value as number[]
        );
        
        tests.push({
          type: 'ttest',
          fields: [field1.name, field2.name],
          result
        });
      }
    }
    
    return tests;
  }

  private performTTest(sample1: number[], sample2: number[]) {
    const n1 = sample1.length;
    const n2 = sample2.length;
    
    const mean1 = sample1.reduce((a, b) => a + b, 0) / n1;
    const mean2 = sample2.reduce((a, b) => a + b, 0) / n2;
    
    const variance1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
    const variance2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);
    
    const pooledVariance = ((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2);
    const standardError = Math.sqrt(pooledVariance * (1/n1 + 1/n2));
    
    const tStatistic = Math.abs(mean1 - mean2) / standardError;
    
    // Simplified p-value calculation (using normal approximation)
    const pValue = 2 * (1 - this.normalCDF(tStatistic));
    
    return {
      statistic: tStatistic,
      pValue,
      significant: pValue < 0.05
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the normal cumulative distribution function
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - probability : probability;
  }
}