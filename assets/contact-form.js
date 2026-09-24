(() => {
  const form = document.querySelector('#contact-message-form');
  if (!form) return;
  const status = document.querySelector('#contact-form-status');
  const button = form.querySelector('button[type="submit"]');
  let token = null;
  let busy = false;
  let idempotencyKey = crypto.randomUUID();
  const loadToken = () => fetch('/api/contact/token', { credentials: 'omit', cache: 'no-store' })
    .then(async (response) => response.ok ? response.json() : null)
    .then((value) => { token = value; }).catch(() => { token = null; });
  let tokenReady = loadToken();

  function errorFor(field, message) {
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    const target = document.querySelector(`#${field.id}-error`);
    if (target) target.textContent = message;
    return !message;
  }
  function validate() {
    const fields = [
      ['contact-name', 'Please enter your name.'],
      ['contact-email', 'Enter a valid email address.'],
      ['contact-subject', 'Please enter a subject.'],
      ['contact-message', 'Please enter a message.'],
    ];
    let first = null;
    for (const [id, message] of fields) {
      const field = document.getElementById(id);
      const invalid = !field.value.trim() || (field.type === 'email' && !field.validity.valid) || (id === 'contact-message' && field.value.trim().length < 10);
      if (!errorFor(field, invalid ? message : '') && !first) first = field;
    }
    const consent = document.getElementById('contact-consent');
    consent.setAttribute('aria-invalid', consent.checked ? 'false' : 'true');
    if (!consent.checked && !first) first = consent;
    first?.focus();
    return !first;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !validate()) return;
    busy = true;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = 'Sending message securely…';
    status.textContent = 'Sending message securely…';
    try {
      await tokenReady;
      if (!token?.token) throw new Error('service');
      const values = new FormData(form);
      const body = Object.fromEntries(['name', 'email', 'phone', 'subject', 'message', 'website'].map((key) => [key, String(values.get(key) || '')]));
      body.consent = document.getElementById('contact-consent').checked;
      body.startedAt = token.startedAt;
      body.submissionToken = token.token;
      body.idempotencyKey = idempotencyKey;
      const response = await fetch('/api/contact/messages', { method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) {
        if (response.status === 429) status.textContent = 'Too many messages have been sent from this connection. Please wait before trying again.';
        else status.textContent = 'The contact service is temporarily unavailable. Your message has not been cleared. Please try again later.';
        return;
      }
      status.textContent = 'Message sent successfully. Thank you for contacting Lake Group. Our team has received your enquiry and will respond as soon as possible.';
      form.reset();
      token = null;
      idempotencyKey = crypto.randomUUID();
      tokenReady = loadToken();
    } catch (error) {
      status.textContent = error.message === 'service'
        ? 'The contact service is temporarily unavailable. Your message has not been cleared. Please try again later.'
        : "We couldn't send your message because the connection was interrupted. Your message has not been cleared. Check your connection and try again.";
    } finally {
      busy = false; button.disabled = false; button.textContent = label; status.focus();
    }
  });
})();
