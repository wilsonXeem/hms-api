import { baseEmailTemplate } from './base.template';

export const appointmentConfirmationTemplate = (data: {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
  facilityName?: string;
}) => {
  const content = `
    <h2 style="color: #28a745; margin-bottom: 20px;">✅ Appointment Confirmed</h2>
    <p>Dear ${data.patientName},</p>
    <p>Your appointment has been successfully scheduled. Please find the details below:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #495057;">Appointment Details</h3>
      <p><strong>👨‍⚕️ Doctor:</strong> ${data.doctorName}</p>
      <p><strong>📅 Date:</strong> ${data.appointmentDate}</p>
      <p><strong>🕐 Time:</strong> ${data.appointmentTime}</p>
      ${data.reason ? `<p><strong>📋 Reason:</strong> ${data.reason}</p>` : ''}
      ${data.facilityName ? `<p><strong>🏥 Location:</strong> ${data.facilityName}</p>` : ''}
    </div>
    
    <div class="alert alert-warning">
      <strong>⏰ Important Reminder:</strong> Please arrive 15 minutes early for check-in and bring a valid ID.
    </div>
    
    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
    <p>We look forward to seeing you!</p>
  `;
  
  return baseEmailTemplate(content, 'Appointment Confirmation');
};

export const appointmentReminderTemplate = (data: {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
}) => {
  const content = `
    <h2 style="color: #ffc107; margin-bottom: 20px;">⏰ Appointment Reminder</h2>
    <p>Dear ${data.patientName},</p>
    <p>This is a friendly reminder about your upcoming appointment:</p>
    
    <div class="highlight">
      <h3 style="margin-top: 0; color: #495057;">Tomorrow's Appointment</h3>
      <p><strong>👨‍⚕️ Doctor:</strong> ${data.doctorName}</p>
      <p><strong>📅 Date:</strong> ${data.appointmentDate}</p>
      <p><strong>🕐 Time:</strong> ${data.appointmentTime}</p>
      ${data.reason ? `<p><strong>📋 Purpose:</strong> ${data.reason}</p>` : ''}
    </div>
    
    <div class="alert alert-success">
      <strong>📝 Preparation Tips:</strong>
      <ul style="margin: 10px 0;">
        <li>Arrive 15 minutes early</li>
        <li>Bring your ID and insurance card</li>
        <li>Prepare any questions you may have</li>
        <li>Bring a list of current medications</li>
      </ul>
    </div>
    
    <p>Need to reschedule? Contact us as soon as possible.</p>
  `;
  
  return baseEmailTemplate(content, 'Appointment Reminder');
};

export const appointmentCancellationTemplate = (data: {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
}) => {
  const content = `
    <h2 style="color: #dc3545; margin-bottom: 20px;">❌ Appointment Cancelled</h2>
    <p>Dear ${data.patientName},</p>
    <p>We regret to inform you that your appointment has been cancelled:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #495057;">Cancelled Appointment</h3>
      <p><strong>👨‍⚕️ Doctor:</strong> ${data.doctorName}</p>
      <p><strong>📅 Date:</strong> ${data.appointmentDate}</p>
      <p><strong>🕐 Time:</strong> ${data.appointmentTime}</p>
      ${data.reason ? `<p><strong>📋 Reason:</strong> ${data.reason}</p>` : ''}
    </div>
    
    <div class="alert alert-warning">
      <strong>📞 Next Steps:</strong> Please contact us to reschedule your appointment at your earliest convenience.
    </div>
    
    <p>We apologize for any inconvenience caused and look forward to serving you soon.</p>
  `;
  
  return baseEmailTemplate(content, 'Appointment Cancelled');
};

export const appointmentRescheduleTemplate = (data: {
  patientName: string;
  doctorName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
}) => {
  const content = `
    <h2 style="color: #17a2b8; margin-bottom: 20px;">🔄 Appointment Rescheduled</h2>
    <p>Dear ${data.patientName},</p>
    <p>Your appointment has been successfully rescheduled. Please note the new details:</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td width="45%" style="background-color: #fff3cd; padding: 15px; border-radius: 6px; vertical-align: top;">
          <h4 style="margin-top: 0; color: #856404;">Previous Appointment</h4>
          <p><strong>📅 Date:</strong> ${data.oldDate}</p>
          <p><strong>🕐 Time:</strong> ${data.oldTime}</p>
        </td>
        <td width="10%"></td>
        <td width="45%" style="background-color: #d4edda; padding: 15px; border-radius: 6px; vertical-align: top;">
          <h4 style="margin-top: 0; color: #155724;">New Appointment</h4>
          <p><strong>📅 Date:</strong> ${data.newDate}</p>
          <p><strong>🕐 Time:</strong> ${data.newTime}</p>
        </td>
      </tr>
    </table>
    
    <div class="info-box">
      <p><strong>👨‍⚕️ Doctor:</strong> ${data.doctorName}</p>
      ${data.reason ? `<p><strong>📋 Reason for Change:</strong> ${data.reason}</p>` : ''}
    </div>
    
    <div class="alert alert-success">
      <strong>✅ Please update your calendar</strong> with the new appointment time.
    </div>
    
    <p>Thank you for your understanding and flexibility.</p>
  `;
  
  return baseEmailTemplate(content, 'Appointment Rescheduled');
};