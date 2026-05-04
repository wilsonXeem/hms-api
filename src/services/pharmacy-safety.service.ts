import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../config/db.config';
import { drugCatalog } from '../models/drug-catalog.model';
import { patientAllergies } from '../models/patient-allergies.model';
import { patientConditions } from '../models/patient-conditions.model';
import { patients } from '../models/patients.model';

interface SafetyCheck {
  isValid: boolean;
  warnings: SafetyWarning[];
  errors: SafetyError[];
}

interface SafetyWarning {
  type: 'allergy' | 'interaction' | 'contraindication' | 'dosage' | 'pregnancy';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  message: string;
  details?: any;
}

interface SafetyError {
  type: 'invalid_dose' | 'contraindicated' | 'severe_allergy';
  message: string;
}

export class PharmacySafetyService {
  
  async performComprehensiveSafetyCheck(
    patientId: string,
    drugName: string,
    dosage: number,
    doseUnit: string,
    prescribedDrugs: string[] = []
  ): Promise<SafetyCheck> {
    const warnings: SafetyWarning[] = [];
    const errors: SafetyError[] = [];

    // Input validation
    if (!patientId || !drugName || dosage <= 0) {
      errors.push({
        type: 'invalid_dose',
        message: 'Invalid input parameters for safety check'
      });
      return { isValid: false, warnings, errors };
    }

    // Get drug information
    const [drug] = await db.select()
      .from(drugCatalog)
      .where(eq(drugCatalog.genericName, drugName))
      .limit(1);

    if (!drug) {
      errors.push({
        type: 'invalid_dose',
        message: `Drug ${drugName} not found in catalog`
      });
      return { isValid: false, warnings, errors };
    }

    // Check dosage validation
    const dosageCheck = this.validateDosage(drug, dosage, doseUnit);
    if (dosageCheck.error) errors.push(dosageCheck.error);
    if (dosageCheck.warning) warnings.push(dosageCheck.warning);

    // Check patient allergies
    const allergyWarnings = await this.checkPatientAllergies(patientId, drug);
    warnings.push(...allergyWarnings.warnings);
    errors.push(...allergyWarnings.errors);

    // Check contraindications
    const contraindicationWarnings = await this.checkContraindications(patientId, drug);
    warnings.push(...contraindicationWarnings);

    // Check drug interactions
    const interactionWarnings = await this.checkDrugInteractions(drug, prescribedDrugs);
    warnings.push(...interactionWarnings);

    // Check pregnancy safety
    const pregnancyWarnings = await this.checkPregnancySafety(patientId, drug);
    warnings.push(...pregnancyWarnings);

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  private validateDosage(drug: any, dosage: number, doseUnit: string) {
    const result: { error?: SafetyError; warning?: SafetyWarning } = {};

    if (!drug.minDose || !drug.maxDose) {
      return result;
    }

    const minDose = parseFloat(drug.minDose);
    const maxDose = parseFloat(drug.maxDose);

    if (doseUnit !== drug.doseUnit) {
      result.warning = {
        type: 'dosage',
        severity: 'moderate',
        message: `Dose unit mismatch: prescribed ${doseUnit}, expected ${drug.doseUnit}`
      };
    }

    if (dosage < minDose) {
      result.warning = {
        type: 'dosage',
        severity: 'moderate',
        message: `Dose ${dosage}${doseUnit} below minimum recommended ${minDose}${drug.doseUnit}`
      };
    } else if (dosage > maxDose) {
      if (dosage > maxDose * 2) {
        result.error = {
          type: 'invalid_dose',
          message: `Dose ${dosage}${doseUnit} exceeds maximum safe dose ${maxDose}${drug.doseUnit}`
        };
      } else {
        result.warning = {
          type: 'dosage',
          severity: 'high',
          message: `Dose ${dosage}${doseUnit} above recommended maximum ${maxDose}${drug.doseUnit}`
        };
      }
    }

    return result;
  }

  private async checkPatientAllergies(patientId: string, drug: any) {
    const warnings: SafetyWarning[] = [];
    const errors: SafetyError[] = [];

    const allergies = await db.select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId));

    // Check direct drug allergies
    const drugAllergy = allergies.find(a => 
      a.allergenType === 'drug' && 
      (a.allergen.toLowerCase() === drug.genericName.toLowerCase() ||
       a.allergen.toLowerCase() === drug.brandName?.toLowerCase())
    );

    if (drugAllergy) {
      if (drugAllergy.severity === 'life-threatening' || drugAllergy.severity === 'severe') {
        errors.push({
          type: 'severe_allergy',
          message: `Patient has ${drugAllergy.severity} allergy to ${drugAllergy.allergen}`
        });
      } else {
        warnings.push({
          type: 'allergy',
          severity: drugAllergy.severity === 'moderate' ? 'high' : 'moderate',
          message: `Patient has known ${drugAllergy.severity} allergy to ${drugAllergy.allergen}`,
          details: { reaction: drugAllergy.reaction }
        });
      }
    }

    // Check cross-allergies from drug catalog
    if (drug.allergens) {
      for (const allergen of drug.allergens) {
        const crossAllergy = allergies.find(a => 
          a.allergen.toLowerCase().includes(allergen.toLowerCase())
        );
        if (crossAllergy) {
          warnings.push({
            type: 'allergy',
            severity: 'moderate',
            message: `Potential cross-allergy: patient allergic to ${crossAllergy.allergen}, drug contains ${allergen}`
          });
        }
      }
    }

    return { warnings, errors };
  }

  private async checkContraindications(patientId: string, drug: any) {
    const warnings: SafetyWarning[] = [];

    if (!drug.contraindications) return warnings;

    const conditions = await db.select()
      .from(patientConditions)
      .where(and(
        eq(patientConditions.patientId, patientId),
        eq(patientConditions.isActive, true)
      ));

    for (const contraindication of drug.contraindications) {
      const hasCondition = conditions.find(c => 
        c.condition.toLowerCase().includes(contraindication.toLowerCase())
      );
      
      if (hasCondition) {
        warnings.push({
          type: 'contraindication',
          severity: 'high',
          message: `Drug contraindicated in ${hasCondition.condition}`,
          details: { condition: hasCondition.condition }
        });
      }
    }

    return warnings;
  }

  private async checkDrugInteractions(drug: any, prescribedDrugs: string[]) {
    const warnings: SafetyWarning[] = [];

    if (!drug.interactions || prescribedDrugs.length === 0) return warnings;

    for (const interaction of drug.interactions) {
      const conflictingDrug = prescribedDrugs.find(d => 
        d.toLowerCase().includes(interaction.drug.toLowerCase())
      );
      
      if (conflictingDrug) {
        warnings.push({
          type: 'interaction',
          severity: interaction.severity === 'major' ? 'high' : 'moderate',
          message: `${interaction.severity} interaction between ${drug.genericName} and ${conflictingDrug}`,
          details: { description: interaction.description }
        });
      }
    }

    return warnings;
  }

  private async checkPregnancySafety(patientId: string, drug: any) {
    const warnings: SafetyWarning[] = [];

    if (!drug.pregnancyCategory) return warnings;

    // Get patient info to check if female of childbearing age
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient || patient.gender !== 'female') return warnings;

    // Calculate age (simplified)
    const age = patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 0;
    
    if (age >= 12 && age <= 50) {
      if (drug.pregnancyCategory === 'D' || drug.pregnancyCategory === 'X') {
        warnings.push({
          type: 'pregnancy',
          severity: drug.pregnancyCategory === 'X' ? 'critical' : 'high',
          message: `Pregnancy category ${drug.pregnancyCategory}: Risk to fetus. Verify pregnancy status.`
        });
      } else if (drug.pregnancyCategory === 'C') {
        warnings.push({
          type: 'pregnancy',
          severity: 'moderate',
          message: `Pregnancy category C: Use only if benefits outweigh risks`
        });
      }
    }

    return warnings;
  }

  async addPatientAllergy(patientId: string, allergen: string, allergenType: string, severity: string, reaction?: string, recordedBy?: string) {
    const [allergy] = await db.insert(patientAllergies).values({
      patientId,
      allergen,
      allergenType,
      severity,
      reaction,
      recordedBy
    }).returning();

    return allergy;
  }

  async addPatientCondition(patientId: string, condition: string, icd10Code?: string, recordedBy?: string) {
    const [patientCondition] = await db.insert(patientConditions).values({
      patientId,
      condition,
      icd10Code,
      recordedBy
    }).returning();

    return patientCondition;
  }

  async addDrugToCatalog(drugData: any) {
    const [drug] = await db.insert(drugCatalog).values(drugData).returning();
    return drug;
  }
}