#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const required=['DATABASE_URL','DATABASE_URL_RUNTIME','SESSION_SECRET','CMS_ALLOWED_ORIGINS','CSRF_ALLOWED_ORIGINS','BACKUP_ENCRYPTION_KEY','BACKUP_STORAGE_PREFIX','MEDIA_STORAGE_DRIVER','MEDIA_PUBLIC_BASE_URL','S3_REGION','S3_BUCKET','CMS_V2_RELEASE_DIR','CMS_V2_PUBLIC_SITE_ORIGIN','CMS_V2_DEPLOYMENT_TOKEN'];
const optional=['BACKUP_RETENTION_DAYS','MEDIA_UPLOAD_MAX_BYTES','SESSION_COOKIE_SECURE'];
const localNames=new Set(Object.keys(process.env));
try{for(const line of (await readFile(resolve(root,'backend/.env'),'utf8')).split(/\r?\n/)){const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);if(match)localNames.add(match[1])}}catch{}
const ready=required.filter(name=>localNames.has(name)),missing=required.filter(name=>!localNames.has(name)),presentOptional=optional.filter(name=>localNames.has(name)),absentOptional=optional.filter(name=>!localNames.has(name));
const body=`# CMS V2 production configuration readiness\n\nThis audit reports variable names only. It does not read or print secret values. Local presence cannot prove that the deployment platform has the same configuration.\n\n## Ready locally\n\n${ready.map(x=>`- ${x}`).join('\n')||'- None detected'}\n\n## Missing locally / deployment verification required\n\n${missing.map(x=>`- ${x}`).join('\n')||'- None'}\n\n## Optional\n\nPresent: ${presentOptional.join(', ')||'none'}  \nAbsent: ${absentOptional.join(', ')||'none'}\n`;
await mkdir(resolve(root,'docs/reports'),{recursive:true});await writeFile(resolve(root,'docs/reports/CMS_V2_PRODUCTION_READINESS.md'),body);
console.log(`CMS V2 config names: ${ready.length}/${required.length} required names present locally; ${missing.length} require deployment verification.`);
