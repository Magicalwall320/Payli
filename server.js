const express = require('express');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const validatePaymentPayload = (payload) => {
  const errors = [];
  if (!payload.fullName || payload.fullName.trim().length < 3) {
    errors.push('Please provide the card holder\'s full name.');
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Please provide a valid email address.');
  }
  const amount = Number(payload.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.push('Payment amount must be greater than zero.');
  }
  if (!payload.cardNumber || !/^\d{13,19}$/.test(payload.cardNumber)) {
    errors.push('Card number must contain 13 to 19 digits.');
  }
  if (!payload.expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(payload.expiry)) {
    errors.push('Expiry date must be in MM/YY format.');
  }
  if (!payload.cvv || !/^\d{3,4}$/.test(payload.cvv)) {
    errors.push('CVV must contain 3 or 4 digits.');
  }
  return errors;
};

app.post('/api/pay', (req, res) => {
  const validationErrors = validatePaymentPayload(req.body || {});
  if (validationErrors.length) {
    return res.status(400).json({
      status: 'error',
      message: 'Payment validation failed',
      errors: validationErrors,
    });
  }

  const reference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return res.json({
    status: 'success',
    message: 'Payment processed successfully',
    reference,
  });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Payli server running on http://localhost:${PORT}`);
});
