import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const {FlatCompat}=require('@eslint/eslintrc');
const compat=new FlatCompat({baseDirectory:path.dirname(fileURLToPath(import.meta.url))});
const config = [{ignores:['node_modules/**','.netlify/**','.vercel/**','tests/.artifacts/**','playwright-report/**','test-results/**','.next/**','.next-dev/**','.next-production/**','tests/.tmp/**','next-env.d.ts']},...compat.extends('next/core-web-vitals','next/typescript'),{rules:{'@next/next/no-img-element':'off'}},{files:['**/*.cjs','**/*.mjs'],rules:{'@typescript-eslint/no-require-imports':'off'}}];

export default config;
