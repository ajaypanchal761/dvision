const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');

// Simple test email route
router.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Fields "to" and "subject" are required',
      });
    }

    await sendEmail({
      to,
      subject,
      html: html || `<p>${text || 'Test email from Dvision backend'}</p>`,
      text,
    });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
    });
  })
);

module.exports = router;


