const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
function run(args,env=process.env){const result=spawnSync(process.execPath,args,{env,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1)}
run(['scripts/prisma.cjs','generate']);
const target='node_modules/.prisma/mongo-client',stamp=path.join(target,'.veloura-generated');
const fingerprint=createHash('sha256').update(fs.readFileSync('prisma/mongodb.prisma')).update(require('prisma/package.json').version+process.platform+process.arch).digest('hex');
if(fs.existsSync(path.join(target,'index.js'))&&fs.existsSync(path.join(target,'libquery_engine-rhel-openssl-3.0.x.so.node'))&&fs.existsSync(stamp)&&fs.readFileSync(stamp,'utf8')===fingerprint){console.log('MongoDB client matches the current schema.');process.exit(0)}
const env={...process.env,MONGODB_URL:process.env.DATABASE_URL?.startsWith('mongodb')?process.env.DATABASE_URL:'mongodb://127.0.0.1:27017/ecco'};
env.VELOURA_CROSS_PLATFORM='1';
delete env.PRISMA_QUERY_ENGINE_LIBRARY;
run(['scripts/prisma.cjs','generate','--schema','prisma/mongodb.prisma'],env);
fs.writeFileSync(stamp,fingerprint);
