const {test}=require('node:test'),assert=require('node:assert/strict'),{loadTS}=require('./helpers.cjs');
const {isTrustedOrigin}=loadTS('lib/request-security.ts');
test('proxied HTTPS requests accept only the configured public origin and reject foreign browser requests',()=>{
 const canonical='https://store.netlify.app';
 assert.equal(isTrustedOrigin(canonical,'http://internal:3000/api/orders','same-origin',canonical),true);
 assert.equal(isTrustedOrigin('https://evil.test','http://internal:3000/api/orders','same-origin',canonical),false);
 assert.equal(isTrustedOrigin(canonical,'http://internal:3000/api/orders','cross-site',canonical),false);
 assert.equal(isTrustedOrigin('https://evil.test','http://internal:3000/api/orders','same-origin','https://user:pass@evil.test'),false);
 assert.equal(isTrustedOrigin('http://localhost:3000','http://localhost:3000/api/orders','same-origin',canonical),true);
});
const {readApiResponse}=loadTS('lib/api-response.ts');
test('HTML platform outages and invalid JSON become useful errors, while API errors keep their messages',async()=>{
 await assert.rejects(readApiResponse(new Response('<html>Bad gateway</html>',{status:502}),'Please retry'),/Please retry/);
 await assert.rejects(readApiResponse(Response.json({error:'Selection changed'},{status:409}),'Please retry'),/Selection changed/);
 await assert.rejects(readApiResponse(Response.json([]),'Please retry'),/Please retry/);
 assert.equal((await readApiResponse(Response.json({ok:true}),'Please retry')).ok,true);
});
const {checkoutRecoveryLink}=loadTS('lib/checkout-recovery.ts');
test('receipt recovery stays on the store and rejects malformed or expired browser state',()=>{
 const now=1000000000;assert.equal(checkoutRecoveryLink(JSON.stringify({token:'aaa.bbb.ccc',createdAt:now}),now),'/order-success?token=aaa.bbb.ccc');
 for(const value of [null,'{}','invalid',JSON.stringify({token:'https://evil.test',createdAt:now}),JSON.stringify({token:'aaa.bbb.ccc',createdAt:now-7*86400000-1}),JSON.stringify({token:'aaa.bbb.ccc',createdAt:now+1})])assert.equal(checkoutRecoveryLink(value,now),null);
});
const {newCheckoutKey}=loadTS('lib/checkout-key.ts');
test('older browsers without randomUUID still generate valid version-4 retry keys with secure random bytes',()=>{
 const key=newCheckoutKey({getRandomValues:bytes=>bytes.fill(255)});assert.match(key,/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
 assert.throws(()=>newCheckoutKey({}),/Secure checkout is unavailable/);
});
