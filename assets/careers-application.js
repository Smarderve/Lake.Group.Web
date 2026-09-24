(() => {
  const form = document.querySelector('#career-application-form');
  if (!form) return;

  const opportunity = document.querySelector('#career-opportunity');
  const selectedOpportunity = document.querySelector('#career-selected-opportunity');
  const status = document.querySelector('#career-form-status');
  const cvInput = document.querySelector('#career-cv');
  const maxCvBytes = 5 * 1024 * 1024;
  const acceptedExtensions = new Set(['pdf', 'docx']);
  const startedAt = document.querySelector('#career-started-at');
  let submitting = false;
  let token = null;
  let idempotencyKey = crypto.randomUUID();
  const loadToken = () => fetch('/api/careers/token', { credentials: 'omit', cache: 'no-store' })
    .then(async (response) => response.ok ? response.json() : null)
    .then((value) => { token = value; if (startedAt && value) startedAt.value = String(value.startedAt); })
    .catch(() => { token = null; });
  let tokenReady = loadToken();

  function setError(field, message) {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
    return !message;
  }

  function validateField(field) {
    if (field.id === 'career-consent') return setError(field, field.checked ? '' : 'Please agree before submitting.');
    if (field.id === 'career-cv') {
      const file = field.files?.[0];
      if (!file) return setError(field, 'Please choose a CV or resume.');
      const extension = file.name.toLowerCase().split('.').pop();
      if (!acceptedExtensions.has(extension)) return setError(field, 'Please upload your CV as a PDF or DOCX file.');
      if (file.size > maxCvBytes) return setError(field, 'Your CV is larger than the 5 MB limit.');
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
    submitButton.textContent = 'Submitting application securely…';
    submitButton.setAttribute('aria-busy', 'true');
    status.textContent = 'Submitting application securely…';
    status.dataset.state = 'pending';
    status.hidden = false;
    status.focus();
    try {
      await tokenReady;
      if (!token?.token) throw new Error('service');
      const data = new FormData(form);
      data.set('submissionToken', token.token);
      data.set('startedAt', String(token.startedAt));
      data.set('idempotencyKey', idempotencyKey);
      data.set('consent', 'true');
      const response = await fetch('/api/careers/applications', { method: 'POST', body: data, credentials: 'omit', cache: 'no-store' });
      if (!response.ok) {
        const code = (await response.json().catch(() => null))?.error?.code;
        status.textContent = response.status === 429 ? 'Too many submission attempts have been made from this connection. Please wait before trying again.'
          : code === 'UNSUPPORTED_FILE_TYPE' || code === 'MALWARE_DETECTED' ? "We couldn't accept this document. Please export your CV as a new PDF or DOCX file and try again."
            : 'The application service is temporarily unavailable. Your details have not been cleared. Please try again later.';
        status.dataset.state = 'error';
        return;
      }
      status.textContent = 'Application submitted successfully. Thank you for your interest in Lake Group. Our recruitment team has received your application.';
      status.dataset.state = 'success';
      form.reset();
      token = null;
      idempotencyKey = crypto.randomUUID();
      tokenReady = loadToken();
    } catch (error) {
      status.textContent = error.message === 'service'
        ? 'The application service is temporarily unavailable. Your details have not been cleared. Please try again later.'
        : "We couldn't submit your application because the connection was interrupted. Your details have not been cleared. Check your connection and try again.";
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
