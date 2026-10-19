import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
export default function nextConfig(phase:string):NextConfig{return {
 poweredByHeader:false,
 distDir:phase===PHASE_DEVELOPMENT_SERVER?".next-dev":".next-production",
 output:process.env.DOCKER_BUILD==="1"?"standalone":undefined,
 outputFileTracingIncludes:{"/*":["./node_modules/.prisma/mongo-client/**/*"]},
 async redirects(){return [{source:"/in/delhi",destination:"/",permanent:true}]},
 async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}]}
}}
