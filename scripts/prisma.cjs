const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
const env={...process.env,RUST_LOG:process.env.RUST_LOG||'info'};
const generated=path.resolve('node_modules/.prisma/client');
const stampFile=path.join(generated,'.veloura-client.json');
const normalise=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const hash=text=>createHash('sha256').update(text).digest('hex');
const defaultGenerate=process.argv.length===3&&process.argv[2]==='generate';
function fingerprint(){return {source:hash(normalise('prisma/schema.prisma')),generated:hash(normalise(path.join(generated,'schema.prisma'))),prisma:JSON.parse(normalise('node_modules/prisma/package.json')).version,client:JSON.parse(normalise('node_modules/@prisma/client/package.json')).version,platform:process.platform,arch:process.arch};}
if(defaultGenerate){try{const current=fingerprint(),previous=JSON.parse(normalise(stampFile));const native=fs.readdirSync(generated).some(name=>process.platform==='win32'?name==='query_engine-windows.dll.node':name.startsWith('libquery_engine')&&name.endsWith('.node'));if(JSON.stringify(current)===JSON.stringify(previous)&&native&&fs.existsSync(path.join(generated,'index.d.ts'))&&fs.existsSync(path.join(generated,'index.js'))){console.log('Prisma client matches the current schema; no regeneration needed.');process.exit(0)}}catch{}}
if(process.platform==='win32'){for(const [key,file] of [['PRISMA_QUERY_ENGINE_LIBRARY','query_engine-windows.dll.node'],['PRISMA_SCHEMA_ENGINE_BINARY','schema-engine-windows.exe']]){if(key==='PRISMA_QUERY_ENGINE_LIBRARY'&&env.VELOURA_CROSS_PLATFORM==='1')continue;const engine=path.resolve('node_modules/@prisma/engines',file);if(!env[key]&&fs.existsSync(engine))env[key]=engine;}}
if(process.argv[2]==='db'&&process.argv[3]==='push'&&env.DATABASE_URL?.startsWith('file:')&&!env.DATABASE_URL.includes(':memory:')){const file=path.resolve('prisma',decodeURIComponent(env.DATABASE_URL.slice(5).split('?')[0]));if(!fs.existsSync(file)){fs.mkdirSync(path.dirname(file),{recursive:true});fs.closeSync(fs.openSync(file,'wx'));}}
const result=spawnSync(process.execPath,[path.resolve('node_modules/prisma/build/index.js'),...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true});
if(result.error)console.error(result.error.message);
if(result.status===0&&defaultGenerate){try{fs.writeFileSync(stampFile,JSON.stringify(fingerprint()))}catch{console.warn('Prisma generated successfully, but its cache stamp could not be saved.')}}
process.exit(result.status??1);
