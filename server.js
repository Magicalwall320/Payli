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

const validatePaymentPayload = (payload = {}) => {
  const errors = [];
  const flow = typeof payload.flow === 'string' ? payload.flow.toLowerCase() : '';
  if (!['send', 'receive'].includes(flow)) {
    errors.push('Please select whether this is a send or receive movement.');
  }
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  if (fullName.length < 3) {
    errors.push('Please provide the counterparty\'s full name.');
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address.');
  }
  const amount = Number(payload.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.push('Transfer amount must be greater than zero.');
  }
  if (typeof payload.memo === 'string' && payload.memo.trim().length > 280) {
    errors.push('Internal memo must be 280 characters or fewer.');
  }
  return errors;
};

app.post('/api/pay', (req, res) => {
  const validationErrors = validatePaymentPayload(req.body);
  if (validationErrors.length) {
    return res.status(400).json({
      status: 'error',
      message: 'Transfer validation failed',
      errors: validationErrors,
    });
  }

  const reference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const flow = typeof req.body.flow === 'string' && req.body.flow.toLowerCase() === 'send' ? 'send' : 'receive';
  const message = flow === 'send' ? 'Send transfer queued successfully' : 'Receive request generated successfully';

  return res.json({
    status: 'success',
    message,
    reference,
  });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Payli server running on http://localhost:${PORT}`);
});
