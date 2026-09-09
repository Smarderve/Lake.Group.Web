(() => {
  const form = document.querySelector('#career-application-form');
  if (!form) return;

  const opportunity = document.querySelector('#career-opportunity');
  const selectedOpportunity = document.querySelector('#career-selected-opportunity');
  const status = document.querySelector('#career-form-status');
  const cvInput = document.querySelector('#career-cv');
  const maxCvBytes = 10 * 1024 * 1024;
  const acceptedExtensions = new Set(['pdf', 'doc', 'docx']);
  const startedAt = document.querySelector('#career-started-at');
  let submitting = false;
  if (startedAt) startedAt.value = String(Date.now());

  function setError(field, message) {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
    return !message;
  }

  function validateField(field) {
    if (field.id === 'career-cv') {
      const file = field.files?.[0];
      if (!file) return setError(field, 'Please choose a CV or resume.');
      const extension = file.name.toLowerCase().split('.').pop();
      if (!acceptedExtensions.has(extension)) return setError(field, 'Use a PDF, DOC or DOCX file.');
      if (file.size > maxCvBytes) return setError(field, 'Your file must be 10 MB or smaller.');
      return setError(field, '');
    }
    if (field.required && !field.value.trim()) return setError(field, 'This field is required.');
    if (field.type === 'email' && field.value && !field.validity.valid) return setError(field, 'Enter a valid email address.');
    return setError(field, '');
  }

  function updateSelectedOpportunity(value) {
    opportunity.value = value || '';
    selectedOpportunity.hidden = !value;
    selectedOpportunity.textContent = value ? `Applying for: ${value}` : '';
  }

  function focusApplication() {
    document.querySelector('#apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => form.querySelector('#career-name')?.focus(), 350);
  }

  document.querySelectorAll('[data-opportunity]').forEach((link) => {
    link.addEventListener('click', () => {
      updateSelectedOpportunity(link.dataset.opportunity);
      window.setTimeout(focusApplication, 0);
    });
  });

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.cr-benefit').forEach((card) => {
      let frame = 0;
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(-3, Math.min(3, ((event.clientX - rect.left) / rect.width - 0.5) * 6));
        const y = Math.max(-3, Math.min(3, ((event.clientY - rect.top) / rect.height - 0.5) * 6));
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          card.style.setProperty('--card-x', `${x.toFixed(2)}px`);
          card.style.setProperty('--card-y', `${y.toFixed(2)}px`);
          card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
        });
      });
      card.addEventListener('pointerleave', () => {
        window.cancelAnimationFrame(frame);
        card.style.setProperty('--card-x', '0px');
        card.style.setProperty('--card-y', '0px');
      });
    });
  }

  cvInput.addEventListener('change', () => {
    validateField(cvInput);
  });
  window.addEventListener('career-cv-error', (event) => {
    const message = event.detail || 'This CV format is not supported.';
    setError(cvInput, message);
  });

  form.querySelectorAll('input, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    status.hidden = true;
    status.removeAttribute('data-state');
    const fields = [...form.querySelectorAll('input, textarea')]
      .filter((field) => field.type !== 'hidden' && field.type !== 'submit');
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }
    const submitButton = form.querySelector('button[type="submit"]');
    submitting = true;
    submitButton.disabled = true;
    submitButton.dataset.defaultLabel = submitButton.textContent;
    submitButton.textContent = 'Submitting…';
    submitButton.setAttribute('aria-busy', 'true');
    status.textContent = 'Submitting your application…';
    status.dataset.state = 'pending';
    status.hidden = false;
    status.focus();
    try {
      const apiBase = (window.LAKE_API_BASE || '').replace(/\/+$/, '');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch(`${apiBase}/api/careers/applications`, { method: 'POST', body: new FormData(form), credentials: 'omit', signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = { 400: 'Please check the highlighted fields.', 413: 'Your CV is larger than the 10 MB limit.', 415: 'This CV format is not supported.', 429: 'Too many attempts. Please wait a moment and try again.' };
        throw new Error(messages[response.status] || body?.error?.message || 'We could not submit your application right now. Please try again.');
      }
      status.textContent = 'APPLICATION RECEIVED. Thank you for your interest in Lake Group.';
      status.dataset.state = 'success';
      form.reset();
      document.querySelector('.cr-ac-upload-remove')?.click();
      if (startedAt) startedAt.value = String(Date.now());
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'The application service took too long to respond. Please try again.' : (error.message || 'We could not reach the application service. Check your connection and try again.');
      status.dataset.state = 'error';
    } finally {
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.defaultLabel || 'Submit application';
      submitButton.removeAttribute('aria-busy');
      status.focus();
    }
  });
})();
