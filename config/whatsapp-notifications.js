const { getSetting } = require('./settingsManager');
const billingManager = require('./billing');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class WhatsAppNotificationManager {
    constructor() {
        this.sock = null;
        this.templatesFile = path.join(__dirname, '../data/whatsapp-templates.json');
        this.templates = this.loadTemplates() || {
            invoice_created: {
                title: 'Tagihan Baru',
                template: `📋 *TAGIHAN BARU*

Halo {customer_name},

Tagihan bulanan Anda telah dibuat:

📄 *No. Invoice:* {invoice_number}
💰 *Jumlah:* Rp {amount}
📅 *Jatuh Tempo:* {due_date}
📦 *Paket:* {package_name} ({package_speed})
📝 *Catatan:* {notes}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari denda keterlambatan.

Terima kasih atas kepercayaan Anda.`,
                enabled: true
            },
            due_date_reminder: {
                title: 'Peringatan Jatuh Tempo',
                template: `⚠️ *PERINGATAN JATUH TEMPO*

Halo {customer_name},

Tagihan Anda akan jatuh tempo dalam {days_remaining} hari:

📄 *No. Invoice:* {invoice_number}
💰 *Jumlah:* Rp {amount}
📅 *Jatuh Tempo:* {due_date}
📦 *Paket:* {package_name} ({package_speed})

Silakan lakukan pembayaran segera untuk menghindari denda keterlambatan.

Terima kasih.`,
                enabled: true
            },
            payment_received: {
                title: 'Pembayaran Diterima',
                template: `✅ *PEMBAYARAN DITERIMA*

Halo {customer_name},

Terima kasih! Pembayaran Anda telah kami terima:

📄 *No. Invoice:* {invoice_number}
💰 *Jumlah:* Rp {amount}
💳 *Metode Pembayaran:* {payment_method}
📅 *Tanggal Pembayaran:* {payment_date}
🔢 *No. Referensi:* {reference_number}

Layanan internet Anda akan tetap aktif. Terima kasih atas kepercayaan Anda.`,
                enabled: true
            },
            service_disruption: {
                title: 'Gangguan Layanan',
                template: `🚨 *GANGGUAN LAYANAN*

Halo Pelanggan Setia,

Kami informasikan bahwa sedang terjadi gangguan pada jaringan internet:

📡 *Jenis Gangguan:* {disruption_type}
📍 *Area Terdampak:* {affected_area}
⏰ *Perkiraan Selesai:* {estimated_resolution}
📞 *Hotline:* {support_phone}

Kami sedang bekerja untuk mengatasi masalah ini secepat mungkin. Mohon maaf atas ketidaknyamanannya.

Terima kasih atas pengertian Anda.`,
                enabled: true
            },
            service_announcement: {
                title: 'Pengumuman Layanan',
                template: `📢 *PENGUMUMAN LAYANAN*

Halo Pelanggan Setia,

{announcement_content}

Terima kasih atas perhatian Anda.`,
                enabled: true
            },

            service_suspension: {
                title: 'Service Suspension',
                template: `⚠️ *LAYANAN INTERNET DINONAKTIFKAN*

Halo {customer_name},

Layanan internet Anda telah dinonaktifkan karena:
📋 *Alasan:* {reason}

💡 *Cara Mengaktifkan Kembali:*
1. Lakukan pembayaran tagihan yang tertunggak
2. Layanan akan aktif otomatis setelah pembayaran dikonfirmasi

📞 *Butuh Bantuan?*
Hubungi kami di: 081259872053

*Arknet Digital Solution*
Terima kasih atas perhatian Anda.`,
                enabled: true
            },

            service_restoration: {
                title: 'Service Restoration',
                template: `✅ *LAYANAN INTERNET DIAKTIFKAN*

Halo {customer_name},

Selamat! Layanan internet Anda telah diaktifkan kembali.

📋 *Informasi:*
• Status: AKTIF ✅
• Paket: {package_name}
• Kecepatan: {package_speed}

Terima kasih telah melakukan pembayaran tepat waktu.

*Arknet Digital Solution*
Info: 081259872053`,
                enabled: true
            },
            welcome_message: {
                title: 'Welcome Message',
                template: `👋 *SELAMAT DATANG*

Halo {customer_name},

Selamat datang di layanan internet kami!

📦 *Paket:* {package_name} ({package_speed})
🔑 *Password WiFi:* {wifi_password}
📞 *Support:* {support_phone}

Terima kasih telah memilih layanan kami.`,
                enabled: true
            },
            installation_job_assigned: {
                title: 'Tugas Instalasi Baru',
                template: `🔧 *TUGAS INSTALASI BARU*

Halo {technician_name},

Anda telah ditugaskan untuk instalasi baru:

📋 *Detail Job:*
• No. Job: {job_number}
• Pelanggan: {customer_name}
• Telepon: {customer_phone}
• Alamat: {customer_address}

📦 *Paket Internet:*
• Nama: {package_name}
• Harga: Rp {package_price}

📅 *Jadwal Instalasi:*
• Tanggal: {installation_date}
• Waktu: {installation_time}

📝 *Catatan:* {notes}
🛠️ *Peralatan:* {equipment_needed}

📍 *Lokasi:* {customer_address}

*Status:* Ditugaskan
*Prioritas:* {priority}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *MENU KONFIRMASI:*

1️⃣ *KONFIRMASI PENERIMAAN*
Balas dengan: *TERIMA* atau *OK*

2️⃣ *MULAI INSTALASI*
Balas dengan: *MULAI* atau *START*

3️⃣ *SELESAI INSTALASI*
Balas dengan: *SELESAI* atau *DONE*

4️⃣ *BUTUH BANTUAN*
Balas dengan: *BANTU* atau *HELP*

5️⃣ *LAPOR MASALAH*
Balas dengan: *MASALAH* atau *ISSUE*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *HELPER RESPONS CEPAT:*
• *TERIMA* - Konfirmasi menerima tugas
• *MULAI* - Mulai proses instalasi
• *SELESAI* - Tandai instalasi selesai
• *BANTU* - Minta bantuan teknis
• *MASALAH* - Laporkan kendala

📞 *Support:* 081259872053

Silakan konfirmasi penerimaan tugas ini dengan balasan *TERIMA*.

*Arknet Digital Solution*`,
                enabled: true
            },
            installation_status_update: {
                title: 'Update Status Instalasi',
                template: `🔄 *UPDATE STATUS INSTALASI*

Halo {technician_name},

Status instalasi telah diperbarui:

📋 *Detail Job:*
• No. Job: {job_number}
• Pelanggan: {customer_name}
• Status Baru: {new_status}
• Waktu Update: {update_time}

📝 *Catatan:* {notes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *MENU KONFIRMASI:*

1️⃣ *KONFIRMASI UPDATE*
Balas dengan: *KONFIRM* atau *OK*

2️⃣ *BUTUH BANTUAN*
Balas dengan: *BANTU* atau *HELP*

3️⃣ *LAPOR MASALAH*
Balas dengan: *MASALAH* atau *ISSUE*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Arknet Digital Solution*`,
                enabled: true
            },
            installation_completed: {
                title: 'Instalasi Selesai',
                template: `✅ *INSTALASI SELESAI*

Halo {technician_name},

Selamat! Instalasi telah berhasil diselesaikan:

📋 *Detail Job:*
• No. Job: {job_number}
• Pelanggan: {customer_name}
• Status: SELESAI ✅
• Waktu Selesai: {completion_time}

📝 *Catatan Penyelesaian:* {completion_notes}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 *MENU KONFIRMASI:*

1️⃣ *KONFIRMASI SELESAI*
Balas dengan: *KONFIRM* atau *OK*

2️⃣ *LAPOR TAMBAHAN*
Balas dengan: *LAPOR* atau *REPORT*

3️⃣ *BUTUH BANTUAN*
Balas dengan: *BANTU* atau *HELP*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *HELPER RESPONS CEPAT:*
• *KONFIRM* - Konfirmasi penyelesaian
• *LAPOR* - Laporkan detail tambahan
• *BANTU* - Minta bantuan teknis

*Arknet Digital Solution*`,
                enabled: true
            }
        };
    }

    setSock(sockInstance) {
        this.sock = sockInstance;
    }

    // Format phone number for WhatsApp
    formatPhoneNumber(number) {
        let cleaned = number.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        }
        if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }
        return cleaned;
    }

    // Helper method to get invoice image path with fallback handling
    getInvoiceImagePath() {
        const imagePaths = [
            path.resolve(__dirname, '../public/img/tagihan.jpg'),
            path.resolve(__dirname, '../public/img/tagihan.png'), 
            path.resolve(__dirname, '../public/img/invoice.jpg'),
            path.resolve(__dirname, '../public/img/invoice.png'),
            path.resolve(__dirname, '../public/img/logo.png')
        ];
        
        // Check each path and return the first one that exists
        for (const imagePath of imagePaths) {
            if (fs.existsSync(imagePath)) {
                logger.info(`📸 Using invoice image: ${imagePath}`);
                return imagePath;
            }
        }
        
        // Log if no image found (will send text-only)
        logger.warn(`⚠️ No invoice image found, will send text-only notification`);
        return null;
    }

    // Replace template variables with actual data
    replaceTemplateVariables(template, data) {
        let message = template;
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{${key}}`;
            message = message.replace(new RegExp(placeholder, 'g'), value || '');
        }
        return message;
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Send notification with header and footer
    async sendNotification(phoneNumber, message, options = {}) {
        try {
            if (!this.sock) {
                logger.error('WhatsApp sock not initialized');
                return { success: false, error: 'WhatsApp not connected' };
            }

            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const jid = `${formattedNumber}@s.whatsapp.net`;

            // Add header and footer
            const companyHeader = getSetting('company_header', '📱 Arknet Digital Solution 📱\n\n');
            const footerSeparator = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            const footerInfo = footerSeparator + getSetting('footer_info', 'Powered by Arknet Digital Solution');
            
            const fullMessage = `${companyHeader}${message}${footerInfo}`;
            
            // If imagePath provided and exists, try to send as image with caption
            if (options.imagePath) {
                try {
                    const imagePath = options.imagePath;
                    logger.info(`📸 Mencoba mengirim dengan gambar: ${imagePath}`);
                    
                    if (fs.existsSync(imagePath)) {
                        await this.sock.sendMessage(jid, { image: { url: imagePath }, caption: fullMessage });
                        logger.info(`✅ WhatsApp image notification sent to ${phoneNumber} with image`);
                        return { success: true, withImage: true };
                    } else {
                        logger.warn(`⚠️ Image not found at path: ${imagePath}, falling back to text message`);
                    }
                } catch (imgErr) {
                    logger.error(`❌ Failed sending image to ${phoneNumber}, falling back to text:`, imgErr);
                }
            }

            // Send as text message (fallback or when no image specified)
            await this.sock.sendMessage(jid, { text: fullMessage }, options);
            
            logger.info(`✅ WhatsApp text notification sent to ${phoneNumber}`);
            return { success: true, withImage: false };
        } catch (error) {
            logger.error(`Error sending WhatsApp notification to ${phoneNumber}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send invoice created notification
    async sendInvoiceCreatedNotification(customerId, invoiceId) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('invoice_created')) {
                logger.info('Invoice created notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            const customer = await billingManager.getCustomerById(customerId);
            const invoice = await billingManager.getInvoiceById(invoiceId);
            const packageData = await billingManager.getPackageById(invoice.package_id);

            if (!customer || !invoice || !packageData) {
                logger.error('Missing data for invoice notification');
                return { success: false, error: 'Missing data' };
            }

            const data = {
                customer_name: customer.name,
                invoice_number: invoice.invoice_number,
                amount: this.formatCurrency(invoice.amount),
                due_date: this.formatDate(invoice.due_date),
                package_name: packageData.name,
                package_speed: packageData.speed,
                notes: invoice.notes || 'Tagihan bulanan'
            };

            const message = this.replaceTemplateVariables(
                this.templates.invoice_created.template,
                data
            );

            // Attach invoice banner image if available
            const imagePath = this.getInvoiceImagePath();
            return await this.sendNotification(customer.phone, message, { imagePath });
        } catch (error) {
            logger.error('Error sending invoice created notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send due date reminder
    async sendDueDateReminder(invoiceId) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('due_date_reminder')) {
                logger.info('Due date reminder notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            const invoice = await billingManager.getInvoiceById(invoiceId);
            const customer = await billingManager.getCustomerById(invoice.customer_id);
            const packageData = await billingManager.getPackageById(invoice.package_id);

            if (!customer || !invoice || !packageData) {
                logger.error('Missing data for due date reminder');
                return { success: false, error: 'Missing data' };
            }

            const dueDate = new Date(invoice.due_date);
            const today = new Date();
            const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            const data = {
                customer_name: customer.name,
                invoice_number: invoice.invoice_number,
                amount: this.formatCurrency(invoice.amount),
                due_date: this.formatDate(invoice.due_date),
                days_remaining: daysRemaining,
                package_name: packageData.name,
                package_speed: packageData.speed
            };

            const message = this.replaceTemplateVariables(
                this.templates.due_date_reminder.template,
                data
            );

            // Attach same invoice banner image
            const imagePath = this.getInvoiceImagePath();
            return await this.sendNotification(customer.phone, message, { imagePath });
        } catch (error) {
            logger.error('Error sending due date reminder:', error);
            return { success: false, error: error.message };
        }
    }

    // Send payment received notification
    async sendPaymentReceivedNotification(paymentId) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('payment_received')) {
                logger.info('Payment received notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            const payment = await billingManager.getPaymentById(paymentId);
            const invoice = await billingManager.getInvoiceById(payment.invoice_id);
            const customer = await billingManager.getCustomerById(invoice.customer_id);

            if (!payment || !invoice || !customer) {
                logger.error('Missing data for payment notification');
                return { success: false, error: 'Missing data' };
            }

            const data = {
                customer_name: customer.name,
                invoice_number: invoice.invoice_number,
                amount: this.formatCurrency(payment.amount),
                payment_method: payment.payment_method,
                payment_date: this.formatDate(payment.payment_date),
                reference_number: payment.reference_number || 'N/A'
            };

            const message = this.replaceTemplateVariables(
                this.templates.payment_received.template,
                data
            );

            // Attach same invoice banner image
            const imagePath = this.getInvoiceImagePath();
            return await this.sendNotification(customer.phone, message, { imagePath });
        } catch (error) {
            logger.error('Error sending payment received notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send service disruption notification
    async sendServiceDisruptionNotification(disruptionData) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('service_disruption')) {
                logger.info('Service disruption notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            const customers = await billingManager.getCustomers();
            const activeCustomers = customers.filter(c => c.status === 'active' && c.phone);

            const data = {
                disruption_type: disruptionData.type || 'Gangguan Jaringan',
                affected_area: disruptionData.area || 'Seluruh Area',
                estimated_resolution: disruptionData.estimatedTime || 'Sedang dalam penanganan',
                support_phone: getSetting('support_phone', '081259872053')
            };

            const message = this.replaceTemplateVariables(
                this.templates.service_disruption.template,
                data
            );

            let successCount = 0;
            let errorCount = 0;

            for (const customer of activeCustomers) {
                const result = await this.sendNotification(customer.phone, message);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            return {
                success: true,
                sent: successCount,
                failed: errorCount,
                total: activeCustomers.length
            };
        } catch (error) {
            logger.error('Error sending service disruption notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send service announcement
    async sendServiceAnnouncement(announcementData) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('service_announcement')) {
                logger.info('Service announcement notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            const customers = await billingManager.getCustomers();
            const activeCustomers = customers.filter(c => c.status === 'active' && c.phone);

            const data = {
                announcement_content: announcementData.content || 'Tidak ada konten pengumuman'
            };

            const message = this.replaceTemplateVariables(
                this.templates.service_announcement.template,
                data
            );

            let successCount = 0;
            let errorCount = 0;

            for (const customer of activeCustomers) {
                const result = await this.sendNotification(customer.phone, message);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            return {
                success: true,
                sent: successCount,
                failed: errorCount,
                total: activeCustomers.length
            };
        } catch (error) {
            logger.error('Error sending service announcement:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all templates
    // Load templates from file
    loadTemplates() {
        try {
            if (fs.existsSync(this.templatesFile)) {
                const data = fs.readFileSync(this.templatesFile, 'utf8');
                console.log('✅ [WHATSAPP] Loaded templates from file');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('❌ [WHATSAPP] Error loading templates:', error);
        }
        return null;
    }

    // Save templates to file
    saveTemplates() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.templatesFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.templatesFile, JSON.stringify(this.templates, null, 2));
            console.log('✅ [WHATSAPP] Templates saved to file');
            return true;
        } catch (error) {
            console.error('❌ [WHATSAPP] Error saving templates:', error);
            return false;
        }
    }

    getTemplates() {
        return this.templates;
    }

    // Update template
    updateTemplate(templateKey, newTemplate) {
        if (this.templates[templateKey]) {
            this.templates[templateKey] = newTemplate;
            this.saveTemplates(); // Save to file after update
            return true;
        }
        return false;
    }

    // Update multiple templates at once
    updateTemplates(templatesData) {
        let updated = 0;
        Object.keys(templatesData).forEach(key => {
            if (this.templates[key]) {
                this.templates[key] = templatesData[key];
                updated++;
            }
        });
        
        if (updated > 0) {
            this.saveTemplates(); // Save once after all updates
        }
        
        return updated;
    }

    // Check if template is enabled
    isTemplateEnabled(templateKey) {
        return this.templates[templateKey] && this.templates[templateKey].enabled !== false;
    }

    // Test notification to specific number
    async testNotification(phoneNumber, templateKey, testData = {}) {
        try {
            if (!this.templates[templateKey]) {
                return { success: false, error: 'Template not found' };
            }

            const message = this.replaceTemplateVariables(
                this.templates[templateKey].template,
                testData
            );

            return await this.sendNotification(phoneNumber, message);
        } catch (error) {
            logger.error('Error sending test notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send service suspension notification
    async sendServiceSuspensionNotification(customer, reason) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('service_suspension')) {
                logger.info('Service suspension notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!customer.phone) {
                logger.warn(`Customer ${customer.username} has no phone number for suspension notification`);
                return { success: false, error: 'No phone number' };
            }

            const message = this.replaceTemplateVariables(
                this.templates.service_suspension.template,
                {
                    customer_name: customer.name,
                    reason: reason
                }
            );

            const result = await this.sendNotification(customer.phone, message);
            if (result.success) {
                logger.info(`Service suspension notification sent to ${customer.name} (${customer.phone})`);
            } else {
                logger.error(`Failed to send service suspension notification to ${customer.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending service suspension notification to ${customer.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send service restoration notification
    async sendServiceRestorationNotification(customer, reason) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('service_restoration')) {
                logger.info('Service restoration notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!customer.phone) {
                logger.warn(`Customer ${customer.username} has no phone number for restoration notification`);
                return { success: false, error: 'No phone number' };
            }

            const message = this.replaceTemplateVariables(
                this.templates.service_restoration.template,
                {
                    customer_name: customer.name,
                    package_name: customer.package_name || 'N/A',
                    package_speed: customer.package_speed || 'N/A',
                    reason: reason || ''
                }
            );

            const result = await this.sendNotification(customer.phone, message);
            if (result.success) {
                logger.info(`Service restoration notification sent to ${customer.name} (${customer.phone})`);
            } else {
                logger.error(`Failed to send service restoration notification to ${customer.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending service restoration notification to ${customer.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send welcome message notification
    async sendWelcomeMessage(customer) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('welcome_message')) {
                logger.info('Welcome message notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!customer.phone) {
                logger.warn(`Customer ${customer.username} has no phone number for welcome message`);
                return { success: false, error: 'No phone number' };
            }

            const message = this.replaceTemplateVariables(
                this.templates.welcome_message.template,
                {
                    customer_name: customer.name,
                    package_name: customer.package_name || 'N/A',
                    package_speed: customer.package_speed || 'N/A',
                    wifi_password: customer.wifi_password || 'N/A',
                    support_phone: getSetting('support_phone', '081259872053')
                }
            );

            const result = await this.sendNotification(customer.phone, message);
            if (result.success) {
                logger.info(`Welcome message sent to ${customer.name} (${customer.phone})`);
            } else {
                logger.error(`Failed to send welcome message to ${customer.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending welcome message to ${customer.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send installation job assignment notification to technician
    async sendInstallationJobNotification(technician, installationJob, customer, packageData) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('installation_job_assigned')) {
                logger.info('Installation job notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!technician.phone) {
                logger.warn(`Technician ${technician.name} has no phone number for installation job notification`);
                return { success: false, error: 'No phone number' };
            }

            // Format installation date
            const installationDate = installationJob.installation_date ? 
                new Date(installationJob.installation_date).toLocaleDateString('id-ID') : 'TBD';

            const message = this.replaceTemplateVariables(
                this.templates.installation_job_assigned.template,
                {
                    technician_name: technician.name,
                    job_number: installationJob.job_number || 'N/A',
                    customer_name: customer.name || installationJob.customer_name || 'N/A',
                    customer_phone: customer.phone || installationJob.customer_phone || 'N/A',
                    customer_address: customer.address || installationJob.customer_address || 'N/A',
                    package_name: packageData.name || installationJob.package_name || 'N/A',
                    package_price: packageData.price ? new Intl.NumberFormat('id-ID').format(packageData.price) : 
                                  installationJob.package_price ? new Intl.NumberFormat('id-ID').format(installationJob.package_price) : 'N/A',
                    installation_date: installationDate,
                    installation_time: installationJob.installation_time || 'TBD',
                    notes: installationJob.notes || 'Tidak ada catatan',
                    equipment_needed: installationJob.equipment_needed || 'Standard equipment',
                    priority: installationJob.priority || 'Normal'
                }
            );

            const result = await this.sendNotification(technician.phone, message);
            if (result.success) {
                logger.info(`Installation job notification sent to technician ${technician.name} (${technician.phone}) for job ${installationJob.job_number}`);
            } else {
                logger.error(`Failed to send installation job notification to technician ${technician.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending installation job notification to technician ${technician.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send installation status update notification to technician
    async sendInstallationStatusUpdateNotification(technician, installationJob, customer, newStatus, notes) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('installation_status_update')) {
                logger.info('Installation status update notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!technician.phone) {
                logger.warn(`Technician ${technician.name} has no phone number for status update notification`);
                return { success: false, error: 'No phone number' };
            }

            // Format status text
            const statusText = {
                'scheduled': 'Terjadwal',
                'assigned': 'Ditugaskan',
                'in_progress': 'Sedang Berlangsung',
                'completed': 'Selesai',
                'cancelled': 'Dibatalkan'
            }[newStatus] || newStatus;

            const message = this.replaceTemplateVariables(
                this.templates.installation_status_update.template,
                {
                    technician_name: technician.name,
                    job_number: installationJob.job_number || 'N/A',
                    customer_name: customer.name || installationJob.customer_name || 'N/A',
                    new_status: statusText,
                    update_time: new Date().toLocaleString('id-ID'),
                    notes: notes || 'Tidak ada catatan'
                }
            );

            const result = await this.sendNotification(technician.phone, message);
            if (result.success) {
                logger.info(`Installation status update notification sent to technician ${technician.name} for job ${installationJob.job_number}`);
            } else {
                logger.error(`Failed to send status update notification to technician ${technician.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending installation status update notification to technician ${technician.name}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send installation completion notification to technician
    async sendInstallationCompletionNotification(technician, installationJob, customer, completionNotes) {
        try {
            // Check if template is enabled
            if (!this.isTemplateEnabled('installation_completed')) {
                logger.info('Installation completion notification is disabled, skipping...');
                return { success: true, skipped: true, reason: 'Template disabled' };
            }

            if (!technician.phone) {
                logger.warn(`Technician ${technician.name} has no phone number for completion notification`);
                return { success: false, error: 'No phone number' };
            }

            const message = this.replaceTemplateVariables(
                this.templates.installation_completed.template,
                {
                    technician_name: technician.name,
                    job_number: installationJob.job_number || 'N/A',
                    customer_name: customer.name || installationJob.customer_name || 'N/A',
                    completion_time: new Date().toLocaleString('id-ID'),
                    completion_notes: completionNotes || 'Tidak ada catatan tambahan'
                }
            );

            const result = await this.sendNotification(technician.phone, message);
            if (result.success) {
                logger.info(`Installation completion notification sent to technician ${technician.name} for job ${installationJob.job_number}`);
            } else {
                logger.error(`Failed to send completion notification to technician ${technician.name}:`, result.error);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error sending installation completion notification to technician ${technician.name}:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new WhatsAppNotificationManager(); 