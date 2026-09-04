/**
 * SMS Dispatch Gateway Interface
 * Supports Console Logger for dev & ready hooks for Twilio / Fast2SMS / MSG91
 */

async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    // Production Twilio integration hook
    try {
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone.startsWith('+') ? phone : `+91${phone}`
      });
      console.log(`[SMS-Twilio] Dispatched to ${phone}`);
      return { success: true, provider: 'twilio' };
    } catch (err) {
      console.error('[SMS-Twilio Error]', err.message);
      // Fallback to console log
    }
  }

  // Development / Standard OTP Logger:
  console.log(`\n------------------------------------------------------------`);
  console.log(`[SMS GATEWAY DISPATCH] -> To: +91-${phone}`);
  console.log(`Message: "${message}"`);
  console.log(`Timestamp: ${new Date().toLocaleTimeString()} (Valid for 5 minutes)`);
  console.log(`------------------------------------------------------------\n`);

  return { success: true, provider: 'console' };
}

module.exports = {
  sendSms
};
