import * as nodemailer from 'nodemailer';
import logger from '../config/logger';

class EmailService {
    private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

    /**
     * Initialize the SMTP transporter lazily.
     * Only creates the transporter once SMTP env vars are set.
     */
    private getTransporter() {
        if (this.transporter) return this.transporter;

        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !port || !user || !pass) {
            logger.warn('SMTP not configured — emails will not be sent');
            return null;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port: parseInt(port, 10),
            secure: parseInt(port, 10) === 465,
            auth: { user, pass },
        });

        logger.info('SMTP transporter initialized');
        return this.transporter;
    }

    /**
     * Send a generic email.
     * Fails silently — logs error but does not throw.
     */
    async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        const transport = this.getTransporter();
        if (!transport) return false;

        try {
            await transport.sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'STF Portal'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject,
                html,
            });
            logger.info(`Email sent to ${to}: ${subject}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send email to ${to}`, error);
            return false;
        }
    }

    /**
     * Send a welcome email after registration.
     */
    async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
        const subject = 'Welcome to Soipan Tuya Foundation Portal';
        const html = `
            <h2>Welcome, ${name}!</h2>
            <p>Thank you for registering with the Soipan Tuya Foundation bursary portal.</p>
            <p>You can now complete your profile and apply for financial assistance.</p>
            <p>If you have any questions, please contact us at ${process.env.CONTACT_EMAIL || 'info@soipantuyafoundation.org'}.</p>
            <br/>
            <p>Best regards,<br/>Soipan Tuya Foundation</p>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send an application status update email.
     */
    async sendApplicationStatusEmail(
        to: string,
        studentName: string,
        applicationNumber: string,
        newStatus: string
    ): Promise<boolean> {
        const subject = `Application ${applicationNumber} Status Update`;
        const statusMessages: Record<string, string> = {
            UNDER_REVIEW: 'is now under review by our team.',
            APPROVED: 'has been approved! Further instructions will follow.',
            REJECTED: 'was not approved at this time. Please contact us for more information.',
            DISBURSED: 'funds have been disbursed.',
        };
        const statusMsg = statusMessages[newStatus] || `status has been updated to ${newStatus}.`;
        const html = `
            <h2>Application Status Update</h2>
            <p>Dear ${studentName},</p>
            <p>Your application <strong>${applicationNumber}</strong> ${statusMsg}</p>
            <p>You can log in to the portal to view more details.</p>
            <br/>
            <p>Best regards,<br/>Soipan Tuya Foundation</p>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send a deadline reminder email.
     */
    async sendDeadlineReminderEmail(
        to: string,
        studentName: string,
        deadline: string
    ): Promise<boolean> {
        const subject = 'Application Deadline Reminder';
        const html = `
            <h2>Deadline Reminder</h2>
            <p>Dear ${studentName},</p>
            <p>This is a reminder that the application deadline is <strong>${deadline}</strong>.</p>
            <p>Please make sure to submit your application before the deadline.</p>
            <br/>
            <p>Best regards,<br/>Soipan Tuya Foundation</p>
        `;
        return this.sendEmail(to, subject, html);
    }
}

const emailService = new EmailService();
export default emailService;
