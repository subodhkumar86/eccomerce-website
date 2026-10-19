const {spawnSync}=require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
const url=process.env.DATABASE_URL;
if(!/^mongodb(?:\+srv)?:\/\//.test(url||'')){console.error('Set DATABASE_URL to the MongoDB connection string in your private .env.');process.exit(1)}
const result=spawnSync(process.execPath,['scripts/prisma.cjs','db','push','--schema','prisma/mongodb.prisma','--skip-generate'],{env:{...process.env,MONGODB_URL:url},encoding:'utf8',timeout:45000,windowsHide:true});
if(result.status!==0){const code=(result.stdout+' '+result.stderr).match(/P\d{4}/)?.[0];console.error('MongoDB initialization failed'+(code?` (${code})`:'')+'. Check Atlas credentials, DNS, network access and replica-set availability. No reset was requested.');process.exit(1)}
console.log('MongoDB collections and indexes are ready. Existing records were preserved.');
