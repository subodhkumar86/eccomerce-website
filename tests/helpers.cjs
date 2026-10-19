const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function loadTS(file){const sandbox={exports:{},require:require,process,Buffer,URL,URLSearchParams};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,sandbox,{filename:file});return sandbox.exports}
module.exports={loadTS};
