export function checkoutRecoveryLink(raw:string|null,now=Date.now()){
 try{if(!raw||raw.length>6000)return null;const value:unknown=JSON.parse(raw);if(!value||typeof value!=="object")return null;const {token,createdAt}=value as Record<string,unknown>;if(typeof token!=="string"||token.length>4000||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token)||typeof createdAt!=="number"||!Number.isFinite(createdAt)||createdAt>now||now-createdAt>7*86400000)return null;return `/order-success?token=${encodeURIComponent(token)}`}catch{return null}
}
