require('@next/env').loadEnvConfig(process.cwd());
const {spawnSync}=require('node:child_process');
const args=process.env.DATABASE_URL?.startsWith('mongodb')?['scripts/mongodb-init.cjs']:['scripts/prisma.cjs','db','push','--skip-generate'];
const result=spawnSync(process.execPath,args,{stdio:'inherit',windowsHide:true});process.exit(result.status??1);
