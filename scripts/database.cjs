const {PrismaClient:SqliteClient}=require('@prisma/client');
const {PrismaClient:MongoClient}=require('../node_modules/.prisma/mongo-client');
function createDatabaseClient(url=process.env.DATABASE_URL){return /^mongodb(?:\+srv)?:\/\//.test(url||'')?new MongoClient({datasourceUrl:url}):new SqliteClient(url?{datasourceUrl:url}:undefined)}
module.exports={createDatabaseClient};
