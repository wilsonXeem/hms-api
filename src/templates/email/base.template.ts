import { BrandingConfig } from './types';

const defaultBranding: BrandingConfig = {
  companyName: 'Hospital Management System',
  primaryColor: '#667eea',
  footerText: 'This is an automated message. Please do not reply to this email.'
};

export const baseEmailTemplate = (
  content: string, 
  title: string, 
  branding: Partial<BrandingConfig> = {}
) => {
  const config = { ...defaultBranding, ...branding };
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, ${config.primaryColor || '#667eea'} 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 40px 30px; }
        .footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; color: #6c757d; font-size: 14px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .alert { padding: 15px; border-radius: 6px; margin: 20px 0; }
        .alert-success { background-color: #d4edda; border-left: 4px solid #28a745; color: #155724; }
        .alert-warning { background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404; }
        .alert-danger { background-color: #f8d7da; border-left: 4px solid #dc3545; color: #721c24; }
        .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .highlight { background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 role="banner" aria-label="${config.companyName}">🏥 ${config.companyName}</h1>
        </div>
        <div class="content" role="main">
            ${content}
        </div>
        <div class="footer" role="contentinfo">
            <p>© 2024 ${config.companyName}</p>
            <p>${config.footerText}</p>
        </div>
    </div>
</body>
</html>
`;
};