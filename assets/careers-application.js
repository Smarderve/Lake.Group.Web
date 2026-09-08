(() => {
  const form = document.querySelector('#career-application-form');
  if (!form) return;

  const opportunity = document.querySelector('#career-opportunity');
  const driverFields = document.querySelector('#career-driver-fields');
  const status = document.querySelector('#career-form-status');
  const cvInput = document.querySelector('#career-cv');
  const maxCvBytes = 5 * 1024 * 1024;
  const acceptedExtensions = new Set(['pdf', 'doc', 'docx']);

  function setError(field, message) {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
    return !message;
  }

  function validateField(field) {
    if (field.id === 'career-consent') return setError(field, field.checked ? '' : 'Please confirm your consent.');
    if (field.id === 'career-cv') {
      const file = field.files?.[0];
      if (!file) return setError(field, 'Please choose a CV or resume.');
      const extension = file.name.toLowerCase().split('.').pop();
      if (!acceptedExtensions.has(extension)) return setError(field, 'Use a PDF, DOC or DOCX file.');
      if (file.size > maxCvBytes) return setError(field, 'Your file must be 5 MB or smaller.');
      return setError(field, '');
    }
    if (field.required && !field.value.trim()) return setError(field, 'This field is required.');
    if (field.type === 'email' && field.value && !field.validity.valid) return setError(field, 'Enter a valid email address.');
    if (field.id === 'career-experience' && field.value && (Number(field.value) < 0 || Number(field.value) > 60)) {
      return setError(field, 'Enter a value from 0 to 60.');
    }
    return setError(field, '');
  }

  function updateDriverFields() {
    const isDriver = opportunity.value === 'Professional Drivers';
    driverFields.hidden = !isDriver;
    if (!isDriver) {
      driverFields.querySelectorAll('input').forEach((field) => {
        field.value = '';
        setError(field, '');
      });
    }
  }

  function focusApplication() {
    document.querySelector('#apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => opportunity?.focus(), 350);
  }

  document.querySelectorAll('[data-opportunity]').forEach((link) => {
    link.addEventListener('click', () => {
      opportunity.value = link.dataset.opportunity;
      updateDriverFields();
      window.setTimeout(focusApplication, 0);
    });
  });

  opportunity.addEventListener('change', updateDriverFields);
  form.querySelectorAll('input, select, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
  });
  cvInput.addEventListener('change', () => validateField(cvInput));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    const fields = [...form.querySelectorAll('input, select, textarea')]
      .filter((field) => !field.closest('[hidden]'))
      .filter((field) => field.type !== 'button' && field.type !== 'submit');
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      const firstInvalid = fields.find((field) => field.getAttribute('aria-invalid') === 'true');
      firstInvalid?.focus();
      return;
    }
    status.textContent = 'Your details are ready for review, but this site is not yet connected to a careers submission service. Nothing has been sent or stored. Please use the Contact Us page to arrange a secure handoff with the Lake Group team.';
    status.hidden = false;
    status.focus();
  });
})();
