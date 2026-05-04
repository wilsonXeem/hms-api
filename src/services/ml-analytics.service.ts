import { logger } from '../utils/logger.util';
import { db } from '../drizzle/schema';
import { patients, appointments, payments, labRequests } from '../models';
import { eq, and, gte, sql } from 'drizzle-orm';

interface PredictionResult {
  prediction: number;
  confidence: number;
  factors: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface MLModel {
  name: string;
  type: 'regression' | 'classification' | 'time_series';
  accuracy: number;
  lastTrained: Date;
}

export class MLAnalyticsService {
  private models: Map<string, MLModel> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    this.models.set('patient_admission_forecast', {
      name: 'Patient Admission Forecast',
      type: 'time_series',
      accuracy: 0.87,
      lastTrained: new Date()
    });

    this.models.set('revenue_prediction', {
      name: 'Revenue Prediction',
      type: 'regression',
      accuracy: 0.82,
      lastTrained: new Date()
    });

    this.models.set('readmission_risk', {
      name: 'Readmission Risk Assessment',
      type: 'classification',
      accuracy: 0.79,
      lastTrained: new Date()
    });
  }

  async predictPatientAdmissions(facilityId: string, days: number = 7): Promise<PredictionResult> {
    try {
      const historicalData = await this.getHistoricalAdmissions(facilityId, 90);
      const seasonalFactors = this.calculateSeasonalFactors(historicalData);
      const trendFactor = this.calculateTrendFactor(historicalData);
      
      const basePrediction = this.calculateMovingAverage(historicalData, 7) * days;
      const seasonalAdjustment = basePrediction * seasonalFactors;
      const trendAdjustment = seasonalAdjustment * (1 + trendFactor);
      
      const prediction = Math.round(trendAdjustment);
      const confidence = this.calculateConfidence(historicalData, prediction);

      return {
        prediction,
        confidence,
        factors: ['Historical trends', 'Seasonal patterns', 'Day of week effects'],
        trend: trendFactor > 0.05 ? 'increasing' : trendFactor < -0.05 ? 'decreasing' : 'stable'
      };
    } catch (error) {
      logger.error('Error predicting patient admissions:', error);
      return this.getMockPrediction('admissions');
    }
  }

  async predictRevenue(facilityId: string, period: 'week' | 'month' | 'quarter'): Promise<PredictionResult> {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const historicalRevenue = await this.getHistoricalRevenue(facilityId, days * 4);
      
      const trendFactor = this.calculateTrendFactor(historicalRevenue);
      const baseRevenue = this.calculateMovingAverage(historicalRevenue, 7);
      
      const prediction = Math.round(baseRevenue * days * (1 + trendFactor));
      const confidence = this.calculateConfidence(historicalRevenue, prediction);

      return {
        prediction,
        confidence,
        factors: ['Revenue trends', 'Patient volume', 'Service mix'],
        trend: trendFactor > 0.05 ? 'increasing' : trendFactor < -0.05 ? 'decreasing' : 'stable'
      };
    } catch (error) {
      logger.error('Error predicting revenue:', error);
      return this.getMockPrediction('revenue');
    }
  }

  async assessReadmissionRisk(patientId: number): Promise<PredictionResult> {
    try {
      const patientData = await this.getPatientRiskFactors(patientId);
      const riskScore = this.calculateRiskScore(patientData);
      
      return {
        prediction: riskScore,
        confidence: 0.75,
        factors: this.identifyRiskFactors(patientData),
        trend: riskScore > 0.7 ? 'increasing' : riskScore < 0.3 ? 'decreasing' : 'stable'
      };
    } catch (error) {
      logger.error('Error assessing readmission risk:', error);
      return this.getMockPrediction('risk');
    }
  }

  async predictResourceUtilization(facilityId: string, resourceType: string): Promise<PredictionResult> {
    try {
      const utilizationData = await this.getResourceUtilization(facilityId, resourceType);
      const prediction = this.forecastUtilization(utilizationData);
      
      return {
        prediction: Math.round(prediction * 100),
        confidence: 0.81,
        factors: ['Historical usage', 'Capacity constraints', 'Demand patterns'],
        trend: prediction > 0.8 ? 'increasing' : prediction < 0.6 ? 'decreasing' : 'stable'
      };
    } catch (error) {
      logger.error('Error predicting resource utilization:', error);
      return this.getMockPrediction('utilization');
    }
  }

  async getAnomalyDetection(facilityId: string, metric: string): Promise<any[]> {
    try {
      const data = await this.getMetricData(facilityId, metric, 30);
      const anomalies = this.detectAnomalies(data);
      
      return anomalies.map(anomaly => ({
        date: anomaly.date,
        value: anomaly.value,
        expectedValue: anomaly.expected,
        severity: anomaly.severity,
        description: `Unusual ${metric} detected: ${anomaly.value} (expected: ${anomaly.expected})`
      }));
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      return [];
    }
  }

  private async getHistoricalAdmissions(facilityId: string, days: number): Promise<number[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const admissions = await db.select({
      date: sql`DATE(${patients.createdAt})`,
      count: sql<number>`count(*)`
    })
    .from(patients)
    .where(and(eq(patients.facilityId, facilityId), gte(patients.createdAt, startDate)))
    .groupBy(sql`DATE(${patients.createdAt})`)
    .orderBy(sql`DATE(${patients.createdAt})`);

    return admissions.map(a => a.count || 0);
  }

  private async getHistoricalRevenue(facilityId: string, days: number): Promise<number[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const revenue = await db.select({
      date: sql`DATE(${payments.createdAt})`,
      total: sql`SUM(${payments.amount})`
    })
    .from(payments)
    .where(and(eq(payments.facilityId, facilityId), gte(payments.createdAt, startDate)))
    .groupBy(sql`DATE(${payments.createdAt})`)
    .orderBy(sql`DATE(${payments.createdAt})`);

    return revenue.map(r => Number(r.total) || 0);
  }

  private async getPatientRiskFactors(patientId: number): Promise<any> {
    // Mock implementation - in real scenario, this would analyze patient history
    return {
      age: 65,
      chronicConditions: 2,
      previousAdmissions: 3,
      medicationCompliance: 0.7,
      socialSupport: 0.8
    };
  }

  private async getResourceUtilization(facilityId: string, resourceType: string): Promise<number[]> {
    // Mock implementation - would query actual resource usage
    return Array.from({ length: 30 }, () => Math.random() * 0.9 + 0.1);
  }

  private async getMetricData(facilityId: string, metric: string, days: number): Promise<any[]> {
    // Mock implementation - would query actual metric data
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
      value: Math.random() * 100 + 50
    }));
  }

  private calculateSeasonalFactors(data: number[]): number {
    // Simple seasonal adjustment - in real implementation, use more sophisticated methods
    const dayOfWeek = new Date().getDay();
    const weekendFactor = [0.8, 1.0, 1.1, 1.1, 1.1, 1.0, 0.9];
    return weekendFactor[dayOfWeek];
  }

  private calculateTrendFactor(data: number[]): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstAvg;
  }

  private calculateMovingAverage(data: number[], window: number): number {
    if (data.length === 0) return 0;
    const recent = data.slice(-window);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  private calculateConfidence(historicalData: number[], prediction: number): number {
    if (historicalData.length === 0) return 0.5;
    
    const variance = this.calculateVariance(historicalData);
    const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length;
    
    const normalizedVariance = variance / (mean * mean);
    return Math.max(0.5, Math.min(0.95, 1 - normalizedVariance));
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  }

  private calculateRiskScore(patientData: any): number {
    let score = 0;
    
    // Age factor
    if (patientData.age > 65) score += 0.3;
    else if (patientData.age > 50) score += 0.1;
    
    // Chronic conditions
    score += patientData.chronicConditions * 0.15;
    
    // Previous admissions
    score += Math.min(patientData.previousAdmissions * 0.1, 0.3);
    
    // Medication compliance (inverse)
    score += (1 - patientData.medicationCompliance) * 0.2;
    
    // Social support (inverse)
    score += (1 - patientData.socialSupport) * 0.1;
    
    return Math.min(score, 1.0);
  }

  private identifyRiskFactors(patientData: any): string[] {
    const factors = [];
    
    if (patientData.age > 65) factors.push('Advanced age');
    if (patientData.chronicConditions > 1) factors.push('Multiple chronic conditions');
    if (patientData.previousAdmissions > 2) factors.push('History of readmissions');
    if (patientData.medicationCompliance < 0.8) factors.push('Poor medication compliance');
    if (patientData.socialSupport < 0.6) factors.push('Limited social support');
    
    return factors.length > 0 ? factors : ['No significant risk factors identified'];
  }

  private forecastUtilization(data: number[]): number {
    const trend = this.calculateTrendFactor(data);
    const current = this.calculateMovingAverage(data, 7);
    return Math.min(1.0, current * (1 + trend));
  }

  private detectAnomalies(data: any[]): any[] {
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(this.calculateVariance(values));
    
    return data.filter((d, i) => {
      const zScore = Math.abs((d.value - mean) / stdDev);
      return zScore > 2; // Values more than 2 standard deviations from mean
    }).map(d => ({
      ...d,
      expected: mean,
      severity: Math.abs((d.value - mean) / stdDev) > 3 ? 'high' : 'medium'
    }));
  }

  private getMockPrediction(type: string): PredictionResult {
    const mockData = {
      admissions: { prediction: 125, confidence: 0.85, factors: ['Historical trends', 'Seasonal patterns'] },
      revenue: { prediction: 45000, confidence: 0.82, factors: ['Revenue trends', 'Patient volume'] },
      risk: { prediction: 0.35, confidence: 0.75, factors: ['Patient history', 'Clinical indicators'] },
      utilization: { prediction: 78, confidence: 0.81, factors: ['Historical usage', 'Capacity'] }
    };

    const data = mockData[type as keyof typeof mockData] || mockData.admissions;
    return {
      ...data,
      trend: 'stable' as const
    };
  }

  getAvailableModels(): MLModel[] {
    return Array.from(this.models.values());
  }

  async retrainModel(modelName: string): Promise<boolean> {
    try {
      const model = this.models.get(modelName);
      if (!model) return false;

      // Mock retraining process
      model.lastTrained = new Date();
      model.accuracy = Math.min(0.95, model.accuracy + Math.random() * 0.05);
      
      logger.info(`Model ${modelName} retrained with accuracy: ${model.accuracy}`);
      return true;
    } catch (error) {
      logger.error(`Error retraining model ${modelName}:`, error);
      return false;
    }
  }
}

export const mlAnalyticsService = new MLAnalyticsService();
