/**
 * Escapes HTML characters to prevent XSS attacks
 */
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Safely renders an array of items as HTML list
 */
export const renderSafeList = (items: string[], tag: 'ul' | 'ol' = 'ul'): string => {
  const safeItems = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  return `<${tag}>${safeItems}</${tag}>`;
};

/**
 * Creates email-compatible table layout instead of flexbox
 */
export const createTwoColumnTable = (leftContent: string, rightContent: string): string => {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td width="50%" style="background-color: #fff3cd; padding: 15px; border-radius: 6px; vertical-align: top;">
          ${leftContent}
        </td>
        <td width="10%"></td>
        <td width="40%" style="background-color: #d4edda; padding: 15px; border-radius: 6px; vertical-align: top;">
          ${rightContent}
        </td>
      </tr>
    </table>
  `;
};