const {PrismaClient}=require('@prisma/client');
const {PrismaClient:MongoClient}=require('../node_modules/.prisma/mongo-client');
require('@next/env').loadEnvConfig(process.cwd());
(async()=>{
 if(!/^mongodb(?:\+srv)?:\/\//.test(process.env.DATABASE_URL||''))throw new Error('MongoDB is not configured.');
 const source=new PrismaClient({datasourceUrl:process.env.SQLITE_DATABASE_URL||'file:./dev.db'}),target=new MongoClient({datasourceUrl:process.env.DATABASE_URL});
 try{
  await target.$connect();
  const snapshot={};for(const model of ['category','product','storeSettings'])snapshot[model]=await source[model].findMany();
  // Preserve existing target records. This is an additive copy, never a reset.
  await target.$transaction(async tx=>{for(const [model,rows] of Object.entries(snapshot)){for(const row of rows){const data={...row};await tx[model].upsert({where:{id:data.id},update:{},create:data})}}},{maxWait:10000,timeout:60000});
  for(const [model,rows] of Object.entries(snapshot))console.log(`${model}: ${rows.length} source records copied or already present.`);
  console.log('Public catalogue copy complete. No admin, customer, order or subscriber records were exported. SQLite was not modified.');
 }finally{await source.$disconnect();await target.$disconnect()}
})().catch(error=>{console.error('MongoDB migration could not finish'+(error.code?` (${error.code})`:'')+'. No source records were deleted. Check connection/indexes and retry.');process.exitCode=1});
