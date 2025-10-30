const flowButtons = document.querySelectorAll('[data-flow]');
const themeToggleButton = document.getElementById('themeToggle');
const themeIcon = themeToggleButton?.querySelector('.theme-icon');
const themeText = themeToggleButton?.querySelector('.theme-text');
const closeSheetButton = document.getElementById('closeSheet');
const paymentSheet = document.getElementById('paymentSheet');
const paymentForm = document.getElementById('paymentForm');
const feedback = document.getElementById('paymentFeedback');
const year = document.getElementById('year');
const navButtons = document.querySelectorAll('.nav-link[data-target]');
const screenViews = document.querySelectorAll('.screen-view');
const settingsForm = document.getElementById('settingsForm');
const settingsFeedback = document.getElementById('settingsFeedback');
const transferHistoryButton = document.getElementById('transferHistory');
const flowInputs = paymentForm ? paymentForm.querySelectorAll('input[name="flow"]') : [];
const themePreferenceKey = 'payli-theme';
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
    const firstField = paymentForm.querySelector('input:not([type="radio"]), textarea, select');
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

const setFlowValue = (flow) => {
  if (!flowInputs.length) return;
  const normalized = flow === 'send' ? 'send' : 'receive';
  flowInputs.forEach((input) => {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === normalized;
    }
  });
};

const applyTheme = (theme) => {
  const normalized = theme === 'creme' ? 'creme' : 'brown';
  document.body.setAttribute('data-theme', normalized);
  themeToggleButton?.setAttribute('aria-pressed', String(normalized === 'creme'));
  themeToggleButton?.setAttribute('aria-label', `Switch to ${normalized === 'creme' ? 'brown' : 'creme'} theme`);
  if (themeText) {
    themeText.textContent = normalized === 'creme' ? 'Brown theme' : 'Creme theme';
  }
  if (themeIcon) {
    themeIcon.textContent = normalized === 'creme' ? '🌅' : '🌙';
  }
};

(() => {
  if (typeof localStorage === 'undefined') {
    applyTheme(document.body.getAttribute('data-theme'));
    return;
  }
  try {
    const stored = localStorage.getItem(themePreferenceKey);
    applyTheme(stored === 'creme' ? 'creme' : 'brown');
  } catch (error) {
    applyTheme(document.body.getAttribute('data-theme'));
  }
})();

themeToggleButton?.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') === 'creme' ? 'creme' : 'brown';
  const next = current === 'creme' ? 'brown' : 'creme';
  applyTheme(next);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(themePreferenceKey, next);
    } catch (error) {
      // ignore persistence failures
    }
  }
});

flowButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const flow = button.dataset.flow;
    setFlowValue(flow);
    toggleSheet(true);
  });
});

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

transferHistoryButton?.addEventListener('click', () => setActiveScreen('reports'));

const setFeedback = (type, message) => {
  if (!feedback) return;
  feedback.className = `feedback ${type}`.trim();
  feedback.textContent = message;
};

paymentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setFeedback('', '');

  const formData = new FormData(paymentForm);
  const payload = Object.fromEntries(formData.entries());

  payload.amount = Number(payload.amount);
  payload.fullName = (payload.fullName || '').toString().trim();
  payload.email = (payload.email || '').toString().trim();
  payload.memo = (payload.memo || '').toString().trim();
  payload.flow = payload.flow === 'send' ? 'send' : 'receive';

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
    setFlowValue('receive');
    const firstField = paymentForm.querySelector('input:not([type="radio"]), textarea, select');
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
  settingsFeedback.textContent = 'Preferences saved. Money movement links will use the updated rules.';
  setTimeout(() => {
    if (settingsFeedback) {
      settingsFeedback.textContent = '';
    }
  }, 3000);
});
