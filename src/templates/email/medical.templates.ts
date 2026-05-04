import { baseEmailTemplate } from './base.template';
import { escapeHtml } from './utils';

export const labResultsReadyTemplate = (data: {
  patientName: string;
  testNames: string[];
  doctorName?: string;
  collectionDate?: string;
}) => {
  const content = `
    <h2 style="color: #17a2b8; margin-bottom: 20px;">🧪 Lab Results Available</h2>
    <p>Dear ${data.patientName},</p>
    <p>Your laboratory test results are now available for review:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #495057;">Test Results Ready</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        ${data.testNames.map(test => `<li><strong>${escapeHtml(test)}</strong></li>`).join('')}
      </ul>
      ${data.collectionDate ? `<p><strong>📅 Collection Date:</strong> ${data.collectionDate}</p>` : ''}
      ${data.doctorName ? `<p><strong>👨⚕️ Ordered by:</strong> ${data.doctorName}</p>` : ''}
    </div>
    
    <div class="alert alert-success">
      <strong>📋 How to Access Your Results:</strong>
      <ul style="margin: 10px 0;">
        <li>Log in to your patient portal</li>
        <li>Visit our facility with valid ID</li>
        <li>Contact your doctor's office</li>
      </ul>
    </div>
    
    <p>If you have any questions about your results, please consult with your healthcare provider.</p>
  `;
  
  return baseEmailTemplate(content, 'Lab Results Available');
};

export const criticalResultAlertTemplate = (data: {
  doctorName: string;
  patientName: string;
  testName: string;
  result: string;
  normalRange?: string;
  urgencyLevel: 'high' | 'critical';
}) => {
  const urgencyColor = data.urgencyLevel === 'critical' ? '#dc3545' : '#fd7e14';
  const urgencyIcon = data.urgencyLevel === 'critical' ? '🚨' : '⚠️';
  
  const content = `
    <h2 style="color: ${urgencyColor}; margin-bottom: 20px;">${urgencyIcon} ${data.urgencyLevel.toUpperCase()} Lab Result Alert</h2>
    <p>Dear Dr. ${data.doctorName},</p>
    <p><strong>URGENT ATTENTION REQUIRED:</strong> A ${data.urgencyLevel} laboratory result needs immediate review.</p>
    
    <div class="alert alert-danger">
      <h3 style="margin-top: 0;">Critical Result Details</h3>
      <p><strong>👤 Patient:</strong> ${data.patientName}</p>
      <p><strong>🧪 Test:</strong> ${data.testName}</p>
      <p><strong>📊 Result:</strong> <span style="font-size: 18px; font-weight: bold; color: ${urgencyColor};">${data.result}</span></p>
      ${data.normalRange ? `<p><strong>📏 Normal Range:</strong> ${data.normalRange}</p>` : ''}
      <p><strong>⏰ Alert Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="alert alert-warning">
      <strong>📞 Immediate Action Required:</strong>
      <ul style="margin: 10px 0;">
        <li>Review the complete lab report</li>
        <li>Contact the patient immediately</li>
        <li>Consider appropriate clinical intervention</li>
        <li>Document follow-up actions</li>
      </ul>
    </div>
    
    <p>This alert was generated automatically by the Hospital Management System.</p>
  `;
  
  return baseEmailTemplate(content, `${urgencyIcon} CRITICAL: Lab Result Alert`);
};

export const prescriptionReadyTemplate = (data: {
  patientName: string;
  medications: Array<{name: string; quantity: string; instructions?: string}>;
  pharmacyName?: string;
  pickupInstructions?: string;
}) => {
  const content = `
    <h2 style="color: #6f42c1; margin-bottom: 20px;">💊 Prescription Ready for Pickup</h2>
    <p>Dear ${data.patientName},</p>
    <p>Your prescription has been filled and is ready for pickup:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #495057;">Medications Ready</h3>
      ${data.medications.map(med => `
        <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0; margin: 10px 0;">
          <p><strong>💊 ${escapeHtml(med.name)}</strong></p>
          <p><strong>Quantity:</strong> ${escapeHtml(med.quantity)}</p>
          ${med.instructions ? `<p><strong>Instructions:</strong> ${escapeHtml(med.instructions)}</p>` : ''}
        </div>
      `).join('')}
      ${data.pharmacyName ? `<p><strong>🏥 Pharmacy:</strong> ${data.pharmacyName}</p>` : ''}
    </div>
    
    <div class="alert alert-warning">
      <strong>📋 Pickup Requirements:</strong>
      <ul style="margin: 10px 0;">
        <li>Bring a valid photo ID</li>
        <li>Present your insurance card (if applicable)</li>
        <li>Arrive during pharmacy hours</li>
        ${data.pickupInstructions ? `<li>${data.pickupInstructions}</li>` : ''}
      </ul>
    </div>
    
    <div class="alert alert-success">
      <strong>💡 Medication Safety Tips:</strong>
      <ul style="margin: 10px 0;">
        <li>Read all labels carefully</li>
        <li>Ask questions if you're unsure</li>
        <li>Store medications properly</li>
        <li>Take as prescribed by your doctor</li>
      </ul>
    </div>
    
    <p>If you have any questions about your medications, please consult with our pharmacist.</p>
  `;
  
  return baseEmailTemplate(content, 'Prescription Ready for Pickup');
};

export const medicationReminderTemplate = (data: {
  patientName: string;
  medicationName: string;
  dosage: string;
  nextDose: string;
  instructions?: string;
}) => {
  const content = `
    <h2 style="color: #28a745; margin-bottom: 20px;">⏰ Medication Reminder</h2>
    <p>Dear ${data.patientName},</p>
    <p>This is a friendly reminder about your medication schedule:</p>
    
    <div class="highlight">
      <h3 style="margin-top: 0; color: #495057;">Upcoming Dose</h3>
      <p><strong>💊 Medication:</strong> ${data.medicationName}</p>
      <p><strong>💉 Dosage:</strong> ${data.dosage}</p>
      <p><strong>⏰ Next Dose:</strong> ${data.nextDose}</p>
      ${data.instructions ? `<p><strong>📋 Instructions:</strong> ${data.instructions}</p>` : ''}
    </div>
    
    <div class="alert alert-success">
      <strong>💡 Medication Tips:</strong>
      <ul style="margin: 10px 0;">
        <li>Take your medication at the same time each day</li>
        <li>Don't skip doses</li>
        <li>Contact your doctor if you experience side effects</li>
        <li>Don't stop taking medication without consulting your doctor</li>
      </ul>
    </div>
    
    <p>Stay healthy and keep up with your treatment plan!</p>
  `;
  
  return baseEmailTemplate(content, 'Medication Reminder');
};