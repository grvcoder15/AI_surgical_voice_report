const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(report, callId) {
  const generatedAt = new Date().toLocaleString('en-IN', { hour12: true });
  const safeReport = escapeHtml(report).replace(/\n/g, '<br>');

  return `
  <div style="background:#f4f6f8;padding:28px;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(120deg,#0f172a,#1d4ed8);color:#ffffff;padding:22px 24px;">
        <h2 style="margin:0 0 6px 0;font-size:20px;">Surgical Report Ready</h2>
        <p style="margin:0;font-size:13px;opacity:0.9;">AI-generated operative documentation</p>
      </div>

      <div style="padding:18px 24px 10px 24px;font-size:14px;line-height:1.6;">
        <p style="margin:0 0 10px 0;">Hello,</p>
        <p style="margin:0 0 10px 0;">Please find the generated surgical report details below. The report is also attached as a text file for records.</p>

        <table style="width:100%;border-collapse:collapse;margin:12px 0 16px 0;font-size:13px;">
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;width:170px;"><strong>Call ID</strong></td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(callId)}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Generated At</strong></td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(generatedAt)}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;"><strong>Report Length</strong></td>
            <td style="padding:8px;border:1px solid #e5e7eb;">${report.length} characters</td>
          </tr>
        </table>

        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;background:#fcfcfd;">
          <h3 style="margin:0 0 10px 0;font-size:15px;color:#111827;">Report Preview</h3>
          <div style="font-family:Consolas,Menlo,monospace;font-size:12px;line-height:1.6;color:#111827;max-height:420px;overflow:auto;white-space:normal;">${safeReport}</div>
        </div>

        <p style="margin:14px 0 0 0;font-size:12px;color:#6b7280;">This is an automated email from AI Surgical Voice Report system.</p>
      </div>
    </div>
  </div>
  `;
}

/**
 * Sends email with surgical report.
 * By default, reports are not saved to disk.
 * @param {string} report - The generated surgical report
 * @param {string} callId - The call ID for reference
 * @param {{ sourceReportFilePath?: string }} options - Additional email options
 */
async function sendEmail(report, callId = 'unknown', options = {}) {
  try {
    logger.info('Email Service: Processing report...');
    
    // ===== STEP 1: Print report to console =====
    logger.info('\n' + '='.repeat(80));
    logger.info('📄 GENERATED SURGICAL REPORT');
    logger.info('='.repeat(80));
    console.log(report); // Full report in console
    logger.info('='.repeat(80));
    logger.info(`Report for Call ID: ${callId}`);
    logger.info(`Report Length: ${report.length} characters`);
    logger.info('='.repeat(80) + '\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report_${callId}_${timestamp}.txt`;

    const shouldSaveReportToDisk = String(process.env.SAVE_REPORTS_TO_DISK || 'false').toLowerCase() === 'true';
    let filepath = null;

    if (shouldSaveReportToDisk) {
      const reportsDir = path.join(__dirname, '..', 'reports');

      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
        logger.info('Created reports directory');
      }

      filepath = path.join(reportsDir, filename);
      fs.writeFileSync(filepath, report, 'utf8');
      logger.info(`✅ Report saved to file: ${filename}`);
      logger.info(`📁 Full path: ${filepath}`);
    } else {
      logger.info('Report file save is disabled (SAVE_REPORTS_TO_DISK=false). Sending email only.');
    }
    
    // ===== STEP 3: Try to send email (if credentials configured) =====
    const smtpConfigured = process.env.SMTP_HOST && 
                           process.env.SMTP_USER && 
                           process.env.SMTP_PASS;
    
    if (smtpConfigured) {
      logger.info('Email Service: SMTP credentials found, attempting to send email...');
      
      try {
        const smtpPassword = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: smtpPassword
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: `Surgical Report | Call ${callId}`,
          text: report,
          html: buildEmailHtml(report, callId),
          attachments: []
        };

        if (options.sourceReportFilePath && fs.existsSync(options.sourceReportFilePath)) {
          mailOptions.attachments.push({
            filename: path.basename(options.sourceReportFilePath),
            path: options.sourceReportFilePath,
            contentType: 'text/plain'
          });
        } else if (filepath && fs.existsSync(filepath)) {
          mailOptions.attachments.push({
            filename,
            path: filepath,
            contentType: 'text/plain'
          });
        } else {
          mailOptions.attachments.push({
            filename,
            content: report,
            contentType: 'text/plain'
          });
        }

        await transporter.sendMail(mailOptions);
        logger.info('✅ Email sent successfully!');
        logger.info(`📧 Sent to: ${process.env.EMAIL_TO}`);
        
      } catch (emailError) {
        logger.error(`❌ Email sending failed: ${emailError.message}`);
        logger.warn('Email could not be sent. Report remains available in runtime logs.');
      }
      
    } else {
      logger.warn('⚠️  SMTP credentials not configured in .env');
      logger.warn('Email NOT sent - Report printed to console');
      logger.info('To enable email: Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }
    
    logger.info('Email Service: Processing completed');
    
  } catch (error) {
    logger.error(`Email Service Error: ${error.message}`);
    // Don't throw error - we want webhook to succeed even if email fails
    logger.warn('Report generation succeeded but email service encountered issues');
  }
}

module.exports = {
  sendEmail
};