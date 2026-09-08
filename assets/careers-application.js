(() => {
  const form = document.querySelector('#career-application-form');
  if (!form) return;

  const opportunity = document.querySelector('#career-opportunity');
  const selectedOpportunity = document.querySelector('#career-selected-opportunity');
  const status = document.querySelector('#career-form-status');
  const dropzone = document.querySelector('#career-cv-dropzone');
  const cvInput = document.querySelector('#career-cv');
  const cvFile = document.querySelector('#career-cv-file');
  const maxCvBytes = 10 * 1024 * 1024;
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

  function chooseFile() { cvInput.click(); }
  dropzone.addEventListener('click', (event) => {
    if (event.target !== cvInput) chooseFile();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseFile(); }
  });
  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
  }));
  dropzone.addEventListener('drop', (event) => {
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    cvInput.files = transfer.files;
    cvInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cvInput.addEventListener('change', () => {
    const file = cvInput.files?.[0];
    cvFile.textContent = file ? file.name : 'No file selected';
    validateField(cvInput);
  });

  form.querySelectorAll('input, textarea').forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    const fields = [...form.querySelectorAll('input, textarea')]
      .filter((field) => field.type !== 'hidden' && field.type !== 'submit');
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }
    status.textContent = 'APPLICATION BACKEND CONNECTION REQUIRED. Your information has not been sent or stored. Please use the Contact Us page to arrange a secure handoff with the Lake Group team.';
    status.hidden = false;
    status.focus();
  });
})();
