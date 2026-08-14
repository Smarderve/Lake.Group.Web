import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

async function editorAgent() {
  const user = await makeUser({
    email: 'media-editor@lakegroup.test',
    password: 'media-editor-password',
    role: 'EDITOR',
  });
  const { app } = makeApp({ users: [user] });
  const agent = request.agent(app);
  const login = await agent.post('/auth/login').send({
    email: 'media-editor@lakegroup.test',
    password: 'media-editor-password',
  });
  expect(login.status).toBe(200);
  return agent;
}

describe('media URL protocol hardening', () => {
  it('rejects an executable media URL before it can become a stored CMS link', async () => {
    const agent = await editorAgent();
    const response = await agent.post('/admin/media').send({
      url: 'javascript:alert(document.domain)',
      reason: 'Attempt an unsafe media URL',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects executable variant URLs', async () => {
    const agent = await editorAgent();
    const response = await agent.post('/admin/media').send({
      url: 'https://cdn.example.com/photo.jpg',
      variants: { thumb: 'data:text/html,<script>alert(document.domain)</script>' },
      reason: 'Attempt an unsafe media variant',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
