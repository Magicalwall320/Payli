const newPaymentButton = document.getElementById('newPayment');
const closeSheetButton = document.getElementById('closeSheet');
const paymentSheet = document.getElementById('paymentSheet');
const paymentForm = document.getElementById('paymentForm');
const feedback = document.getElementById('paymentFeedback');
const year = document.getElementById('year');
const navButtons = document.querySelectorAll('.nav-link[data-target]');
const screenViews = document.querySelectorAll('.screen-view');
const settingsForm = document.getElementById('settingsForm');
const settingsFeedback = document.getElementById('settingsFeedback');
let lastFocusedTrigger = null;

if (year) {
  year.textContent = new Date().getFullYear();
}

const setActiveScreen = (target) => {
  if (!screenViews.length) return;
  screenViews.forEach((view) => {
    const isActive = view.dataset.screen === target;
    view.classList.toggle('active', isActive);
    view.toggleAttribute('hidden', !isActive);
    view.setAttribute('aria-hidden', String(!isActive));
  });
  navButtons.forEach((button) => {
    const isActive = button.dataset.target === target;
    button.classList.toggle('active', isActive);
    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });
};

if (navButtons.length) {
  const defaultTarget = document.querySelector('.screen-view.active')?.dataset.screen || navButtons[0].dataset.target;
  if (defaultTarget) {
    setActiveScreen(defaultTarget);
  }
}

const toggleSheet = (open) => {
  if (!paymentSheet) return;
  if (open) {
    lastFocusedTrigger = document.activeElement;
  }
  paymentSheet.classList.toggle('active', open);
  paymentSheet.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open && paymentForm) {
    const firstField = paymentForm.querySelector('input, button, select, textarea');
    window.setTimeout(() => {
      if (firstField instanceof HTMLElement) {
        firstField.focus();
      }
    }, 180);
  }
  if (!open && lastFocusedTrigger instanceof HTMLElement) {
    lastFocusedTrigger.focus();
    lastFocusedTrigger = null;
  }
};

newPaymentButton?.addEventListener('click', () => toggleSheet(true));
closeSheetButton?.addEventListener('click', () => toggleSheet(false));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && paymentSheet?.classList.contains('active')) {
    toggleSheet(false);
  }
});

paymentSheet?.addEventListener('click', (event) => {
  if (event.target === paymentSheet) {
    toggleSheet(false);
  }
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.target) {
      setActiveScreen(button.dataset.target);
    }
  });
});

const setFeedback = (type, message) => {
  if (!feedback) return;
  feedback.className = `feedback ${type}`.trim();
  feedback.textContent = message;
};

const formatCardNumber = (value) => value.replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

paymentForm?.cardNumber?.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const digits = input.value.replace(/\D/g, '');
  input.value = formatCardNumber(digits);
});

paymentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFeedback('', '');

  const formData = new FormData(paymentForm);
  const payload = Object.fromEntries(formData.entries());

  payload.amount = Number(payload.amount);
  payload.cardNumber = payload.cardNumber.replace(/\s+/g, '');

  try {
    const response = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errors ? result.errors.join('\n') : result.message || 'Payment failed');
    }

    setFeedback('success', `${result.message}. Reference: ${result.reference}`);
    paymentForm.reset();
    const firstField = paymentForm.querySelector('input, button, select, textarea');
    if (firstField instanceof HTMLElement) {
      firstField.focus();
    }
    feedback?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    setFeedback('error', error.message || 'Unable to process payment at this time.');
  }
});

settingsForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!settingsFeedback) return;
  settingsFeedback.textContent = 'Preferences saved. Your payment links will use the updated rules.';
  setTimeout(() => {
    if (settingsFeedback) {
      settingsFeedback.textContent = '';
    }
  }, 3000);
});
