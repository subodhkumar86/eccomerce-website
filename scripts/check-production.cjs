const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function productionErrors(env){const sandbox={exports:{},Buffer,URL};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../lib/deployment.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);return sandbox.exports.deploymentErrors(env)}
module.exports={productionErrors};
if(require.main===module){require('@next/env').loadEnvConfig(process.cwd());const errors=productionErrors(process.env);if(errors.length){console.error('Production configuration needs attention:\n'+errors.map(error=>'- '+error).join('\n'));process.exitCode=1}else console.log('Production configuration checks passed.');}
