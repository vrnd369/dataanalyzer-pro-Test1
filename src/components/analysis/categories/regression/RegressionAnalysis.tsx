import { useState } from 'react';
import { DataField } from '@/types/data';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, ScatterChart } from '@/components/charts';
import { 
  calculateAllRegressionMetrics,
  calculateRegularizationPath
} from '@/utils/analysis/regression/RegressionMetricsCalculator';
import { performLinearRegression, performPolynomialRegression } from '@/utils/analysis/regression/metrics';

interface RegressionAnalysisProps {
  fields: DataField[];
}

type RegressionType = 
  | 'linear' 
  | 'multiple_linear' 
  | 'logistic' 
  | 'polynomial'
  | 'ridge' 
  | 'lasso' 
  | 'elastic_net'
  | 'stepwise'
  | 'time_series'
  | 'quantile'
  | 'log_log';

interface RegressionResult {
  fieldName: string;
  metrics: {
    r2Score: number;
    rmse: number;
    mae: number;
    adjustedR2: number;
    aic: number;
    bic: number;
    crossValidationScore?: number;
    fStatistic?: number;
    pValue?: number;
  };
  coefficients: number[];
  predictions: number[];
  residuals: number[];
  actualValues: number[];
  confidenceIntervals?: Array<[number, number]>;
  diagnostics?: {
    residualPlotData: Array<{x: number, y: number}>;
    qqPlotData: Array<{x: number, y: number}>;
    leveragePlotData?: Array<{x: number, y: number}>;
  };
}

export function RegressionAnalysis({ fields }: RegressionAnalysisProps) {
  const [selectedModel, setSelectedModel] = useState<RegressionType>('linear');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [targetField, setTargetField] = useState<string>('');
  const [polynomialDegree, setPolynomialDegree] = useState<number>(2);
  const [regularizationStrength, setRegularizationStrength] = useState<number>(0.1);
  const [crossValidationFolds, setCrossValidationFolds] = useState<number>(5);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  const [results, setResults] = useState<RegressionResult[] | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('configuration');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState<boolean>(false);
  const [selectedVisualization, setSelectedVisualization] = useState<string>('metrics');

  // Filter numeric fields with valid data
  const numericFields = fields.filter(f => 
    f.type === 'number' && 
    Array.isArray(f.value) && 
    f.value.length > 0 &&
    !f.value.some(isNaN)
  );

  const modelTypes: { type: RegressionType; label: string; description: string }[] = [
    { type: 'linear', label: 'Linear', description: 'Simple linear regression for single predictor' },
    { type: 'multiple_linear', label: 'Multiple Linear', description: 'Multiple predictors linear regression' },
    { type: 'logistic', label: 'Logistic', description: 'For binary classification problems' },
    { type: 'polynomial', label: 'Polynomial', description: 'Non-linear relationships with polynomial terms' },
    { type: 'ridge', label: 'Ridge (L2)', description: 'L2 regularization for multicollinearity' },
    { type: 'lasso', label: 'Lasso (L1)', description: 'L1 regularization for feature selection' },
    { type: 'elastic_net', label: 'Elastic Net', description: 'Combined L1 and L2 regularization' },
    { type: 'stepwise', label: 'Stepwise', description: 'Automated feature selection' },
    { type: 'time_series', label: 'Time Series', description: 'For temporal data analysis' },
    { type: 'quantile', label: 'Quantile', description: 'For robust regression' },
    { type: 'log_log', label: 'Log-Log', description: 'For power law relationships' }
  ];

  const handleAnalysis = async () => {
    try {
      setError('');
      
      // Validate inputs
      if (!targetField) {
        setError('Please select a target field');
        return;
      }
      
      const targetFieldData = numericFields.find(f => f.name === targetField);
      if (!targetFieldData) {
        setError('Selected target field not found');
        return;
      }
      
      const y = targetFieldData.value as number[];
      if (y.length < 3) {
        setError('Not enough data points for analysis');
        return;
      }
      
      // Perform regression for each selected feature
      const analysisResults: RegressionResult[] = [];
      
      for (const featureName of selectedFeatures) {
        const feature = numericFields.find(f => f.name === featureName);
        if (!feature) continue;
        
        const x = feature.value as number[];
        
        // Validate data lengths match
        if (x.length !== y.length) {
          console.warn(`Skipping ${featureName}: length mismatch`);
          continue;
        }

        // Create feature field for regression
        const featureField: DataField = {
          name: feature.name,
          type: 'number',
          value: x
        };

        // Perform regression based on selected model
        let regressionResult;
        let numParams = 2; // Default for simple linear
        
        switch (selectedModel) {
          case 'linear':
            regressionResult = performLinearRegression(featureField);
            break;
          case 'polynomial':
            regressionResult = performPolynomialRegression(featureField, polynomialDegree);
            numParams = polynomialDegree + 1;
            break;
          case 'ridge':
          case 'lasso':
          case 'elastic_net':
            // Use existing linear regression as base
            regressionResult = performLinearRegression(featureField);
            // Apply regularization
            const regularizationPath = calculateRegularizationPath(x, y, selectedModel);
            if (regularizationPath) {
              regressionResult.coefficients = regularizationPath[regularizationPath.length - 1].coefficients;
            }
            break;
          default:
            regressionResult = performLinearRegression(featureField);
        }
        
        const { coefficients, predictions } = regressionResult;
        
        // Calculate comprehensive metrics
        const metrics = calculateAllRegressionMetrics(
          y,
          predictions,
          numParams,
          x,
          y,
          crossValidationFolds,
          confidenceLevel
        );

        // Generate diagnostic plots data
        const residuals = metrics.residuals;
        const diagnosticPlots = {
          residualPlotData: predictions.map((pred, i) => ({
            x: pred,
            y: residuals[i]
          })),
          qqPlotData: residuals
            .sort((a, b) => a - b)
            .map((res, i) => ({
              x: Math.sqrt(2) * erfInv((2 * (i + 1) / (residuals.length + 1) - 1)),
              y: res
            }))
        };
        
        analysisResults.push({
          fieldName: featureName,
          metrics,
          coefficients,
          predictions,
          residuals,
          actualValues: y,
          confidenceIntervals: metrics.confidenceIntervals,
          diagnostics: diagnosticPlots
        });
      }
      
      if (analysisResults.length === 0) {
        setError('No valid results could be calculated');
        return;
      }
      
      setResults(analysisResults);
      setActiveTab('results');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  // Helper function for QQ plot
  function erfInv(x: number): number {
    const a = 0.147;
    const sign = x < 0 ? -1 : 1;
    const temp = 2 / (Math.PI * a) + Math.log(1 - x * x) / 2;
    return sign * Math.sqrt(Math.sqrt(temp * temp - Math.log(1 - x * x) / a) - temp);
  }

  const renderRSquared = (value: number) => {
    let className = 'text-2xl font-bold';
    let warning = null;
    
    if (value < 0.3) {
      className += ' text-yellow-600';
      warning = ' (Weak fit)';
    } else if (value < 0.6) {
      className += ' text-blue-600';
      warning = ' (Moderate fit)';
    } else {
      className += ' text-green-600';
      warning = ' (Strong fit)';
    }

    return (
      <div>
        <span className={className}>{(value * 100).toFixed(2)}%</span>
        {warning && <span className="text-sm text-gray-500 ml-2">{warning}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration" className="text-black">Configuration</TabsTrigger>
          <TabsTrigger value="results" disabled={!results} className="text-black">Results</TabsTrigger>
          <TabsTrigger value="diagnostics" disabled={!results} className="text-black">Diagnostics</TabsTrigger>
          <TabsTrigger value="visualizations" disabled={!results} className="text-black">Visualizations</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="text-black">
          <Card>
            <CardContent className="pt-6 space-y-6 text-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black">
                <div className="space-y-4 text-black">
                  <div>
                    <Label className="text-black">Target Field</Label>
                    <Select value={targetField} onValueChange={setTargetField}>
                      <SelectTrigger className="text-black bg-gray-100">
                        <SelectValue placeholder="Select target field" className="text-black"/>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-100">
                        {numericFields.map(field => (
                          <SelectItem key={field.name} value={field.name} className="text-black hover:bg-gray-200">
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Features</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-black">
                      {numericFields.map(field => (
                        <div key={field.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.name}
                            checked={selectedFeatures.includes(field.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedFeatures([...selectedFeatures, field.name]);
                              } else {
                                setSelectedFeatures(selectedFeatures.filter(f => f !== field.name));
                              }
                            }}
                          />
                          <Label htmlFor={field.name} className="cursor-pointer">
                            {field.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Model Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {modelTypes.map(model => (
                        <div
                          key={model.type}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedModel === model.type
                              ? 'bg-blue-50 border-blue-500'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => setSelectedModel(model.type)}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              selectedModel === model.type ? 'bg-blue-500' : 'bg-gray-200'
                            }`} />
                            <span className="text-sm font-medium text-black">{model.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedModel === 'polynomial' && (
                    <div>
                      <Label className="text-black">Polynomial Degree: {polynomialDegree}</Label>
                      <Slider
                        value={[polynomialDegree]}
                        onValueChange={([value]) => setPolynomialDegree(value)}
                        min={2}
                        max={5}
                        step={1}
                      />
                    </div>
                  )}

                  {(selectedModel === 'ridge' || selectedModel === 'lasso' || selectedModel === 'elastic_net') && (
                    <div>
                      <Label className="text-black">Regularization Strength: {regularizationStrength.toFixed(2)}</Label>
                      <Slider
                        value={[regularizationStrength]}
                        onValueChange={([value]) => setRegularizationStrength(value)}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-black">Cross-Validation Folds: {crossValidationFolds}</Label>
                    <Slider
                      value={[crossValidationFolds]}
                      onValueChange={([value]) => setCrossValidationFolds(value)}
                      min={2}
                      max={10}
                      step={1}
                    />
                  </div>

                  <div>
                    <Label className="text-black">Confidence Level: {(confidenceLevel * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[confidenceLevel]}
                      onValueChange={([value]) => setConfidenceLevel(value)}
                      min={0.8}
                      max={0.99}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleAnalysis} className="w-full bg-black text-white hover:bg-gray-800" >
                Run Analysis
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {results && (
            <Card>
              <CardContent className="pt-6 space-y-6 text-black">
                <div className="flex items-center space-x-2 text-black">
                  <Checkbox
                    id="advanced-metrics"
                    checked={showAdvancedMetrics}
                    onCheckedChange={(checked) => setShowAdvancedMetrics(checked as boolean)}
                  />
                  <Label htmlFor="advanced-metrics" className="text-black">Show Advanced Metrics</Label>
                </div>

                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-black mb-4">{result.fieldName}</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-black">R² Score</h4>
                        {renderRSquared(result.metrics.r2Score)}
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-black">Adjusted R²</h4>
                        {renderRSquared(result.metrics.adjustedR2)}
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-black">RMSE</h4>
                        <p className="text-2xl font-bold text-black">{result.metrics.rmse.toFixed(4)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-black">MAE</h4>
                        <p className="text-2xl font-bold text-black">{result.metrics.mae.toFixed(4)}</p>
                      </div>
                    </div>

                    {showAdvancedMetrics && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-black mb-2">Model Information</h4>
                          <div className="bg-gray-50 p-3 rounded-lg text-black">
                            <p>AIC: {result.metrics.aic.toFixed(2)}</p>
                            <p>BIC: {result.metrics.bic.toFixed(2)}</p>
                            {result.metrics.fStatistic && (
                              <p>F-Statistic: {result.metrics.fStatistic.toFixed(2)}</p>
                            )}
                            {result.metrics.pValue && (
                              <p>P-Value: {result.metrics.pValue.toExponential(2)}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-black mb-2">Cross-Validation</h4>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p>Score: {result.metrics.crossValidationScore?.toFixed(4) ?? 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diagnostics">
          {results && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-black mb-4">{result.fieldName}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2 text-black">Residual Plot</h4>
                        {result.diagnostics?.residualPlotData && (
                          <ScatterChart
                            data={result.diagnostics.residualPlotData}
                            xField="x"
                            yField="y"
                            height={300}
                          />
                        )}
                        <div className="text-sm text-gray-500 text-center mt-1">
                          Predicted Values vs Residuals
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 text-black">Q-Q Plot</h4>
                        {result.diagnostics?.qqPlotData && (
                          <ScatterChart
                            data={result.diagnostics.qqPlotData}
                            xField="x"
                            yField="y"
                            height={300}
                          />
                        )}
                        <div className="text-sm text-gray-500 text-center mt-1">
                          Theoretical Quantiles vs Sample Quantiles
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h4 className="font-medium mb-2 text-black">Actual vs Predicted</h4>
                        <ScatterChart
                          data={result.actualValues.map((actual, i) => ({
                            x: actual,
                            y: result.predictions[i]
                          }))}
                          xField="x"
                          yField="y"
                          height={300}
                        />
                        <div className="text-sm text-gray-500 text-center mt-1">
                          Actual Values vs Predicted Values
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="visualizations">
          {results && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="mb-4">
                  <Select
                    value={selectedVisualization}
                    onValueChange={setSelectedVisualization}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visualization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metrics" className="text-black">Model Comparison</SelectItem>
                      <SelectItem value="regularization" className="text-black">Regularization Path</SelectItem>
                      <SelectItem value="predictions" className="text-black">Predictions vs Actual</SelectItem>
                      <SelectItem value="residuals" className="text-black">Residual Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-black mb-4">{result.fieldName}</h3>
                    
                    {selectedVisualization === 'metrics' && (
                      <div className="h-[400px]">
                        <LineChart
                          data={[
                            { name: 'R²', value: result.metrics.r2Score },
                            { name: 'Adjusted R²', value: result.metrics.adjustedR2 },
                            { name: 'RMSE', value: result.metrics.rmse },
                            { name: 'MAE', value: result.metrics.mae }
                          ]}
                          xField="name"
                          yField="value"
                        />
                      </div>
                    )}

                    {selectedVisualization === 'predictions' && (
                      <div className="h-[400px]">
                        <ScatterChart
                          data={result.predictions.map((pred, i) => ({
                            actual: result.actualValues[i],
                            predicted: pred
                          }))}
                          xField="actual"
                          yField="predicted"
                        />
                      </div>
                    )}

                    {selectedVisualization === 'residuals' && (
                      <div className="h-[400px]">
                        <ScatterChart
                          data={result.residuals.map((res, i) => ({
                            predicted: result.predictions[i],
                            residual: res
                          }))}
                          xField="predicted"
                          yField="residual"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 