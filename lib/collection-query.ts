export type CollectionFilters={q:string;category:string;sort:string;budget:string;saved:boolean;stock:boolean;sale:boolean;restocked:boolean;view:"grid"|"gallery"};
export const defaultCollectionFilters:CollectionFilters={q:"",category:"",sort:"featured",budget:"",saved:false,stock:false,sale:false,restocked:false,view:"grid"};
export function readCollectionQuery(params:URLSearchParams):CollectionFilters{
 const budget=params.get("budget")??"";
 return {q:(params.get("q")??"").slice(0,200),category:(params.get("category")??"").slice(0,120),sort:["featured","newest","price-low","price-high"].includes(params.get("sort")??"")?params.get("sort")!:"featured",budget:["2500","5000","10000","15000","25000"].includes(budget)?budget:"",saved:params.get("saved")==="1",stock:params.get("stock")==="1",sale:params.get("sale")==="1",restocked:params.get("restocked")==="1",view:params.get("view")==="gallery"?"gallery":"grid"};
}
export function writeCollectionQuery(filters:CollectionFilters){const params=new URLSearchParams();for(const key of ["q","category","sort","budget","saved","stock","sale","restocked","view"] as const){const value=filters[key];if(value!==defaultCollectionFilters[key]&&value!==false&&value!=="")params.set(key,typeof value==="boolean"?"1":value)}return params.toString()}
