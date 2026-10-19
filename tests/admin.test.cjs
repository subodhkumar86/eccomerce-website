const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file){const sandbox={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,sandbox);return sandbox.exports;}
const {orderTransitionError}=load('lib/order-workflow.ts');
const {csvText,customerSummaries}=load('lib/admin-utils.ts');
test('orders follow fulfilment sequence and terminal states stay terminal',()=>{
 const sequence=['NEW','CONFIRMED','PROCESSING','SHIPPED','DELIVERED'];
 for(let i=0;i<sequence.length-1;i++)assert.equal(orderTransitionError(sequence[i],sequence[i+1]),null);
 assert.ok(orderTransitionError('NEW','DELIVERED'));
 assert.ok(orderTransitionError('SHIPPED','CANCELLED'));
 assert.ok(orderTransitionError('DELIVERED','PROCESSING'));
 assert.ok(orderTransitionError('CANCELLED','NEW'));
 for(const status of ['NEW','CONFIRMED','PROCESSING'])assert.equal(orderTransitionError(status,'CANCELLED'),null);
 assert.equal(orderTransitionError('CANCELLED','CANCELLED'),null);
 assert.equal(orderTransitionError('NEW'),null);
});
test('CSV escapes quotes and line breaks and guards spreadsheet formulas',()=>{
 assert.equal(csvText([['Name','Note'],['A "quote"','line\nbreak']]),'"Name","Note"\r\n"A ""quote""","line\nbreak"');
 assert.equal(csvText([['=SUM(A1)', ' +cmd', '@value', '-value',42,-12]]),'"\'=SUM(A1)","\' +cmd","\'@value","\'-value","42","-12"');
});
test('customer aggregation groups case-insensitive emails and uses latest contact details',()=>{
 const base={email:'USER@example.com',customerName:'Old name',phone:'111',city:'Old city',createdAt:'2026-01-01T00:00:00.000Z',status:'NEW',total:100};
 const results=customerSummaries([base,{...base,email:'user@example.com',customerName:'New name',phone:'222',city:'New city',createdAt:'2026-03-01T00:00:00.000Z',status:'CANCELLED',total:500},{...base,email:'other@example.com',createdAt:'2026-02-01T00:00:00.000Z'}]);
 assert.equal(results.length,2);assert.equal(results[0].email,'user@example.com');assert.equal(results[0].orders,2);assert.equal(results[0].value,100);assert.equal(results[0].name,'New name');assert.equal(results[0].city,'New city');
 assert.equal(base.customerName,'Old name');assert.equal(customerSummaries([]).length,0);
});
