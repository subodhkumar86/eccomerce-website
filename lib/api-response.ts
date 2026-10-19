export async function readApiResponse<T extends object>(response:Response,fallback:string):Promise<T>{
 const data:unknown=await response.json().catch(()=>null);
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error(fallback);
 if(!response.ok){const error=(data as Record<string,unknown>).error;throw new Error(typeof error==="string"?error:fallback)}
 return data as T;
}
