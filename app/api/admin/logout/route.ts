import { rejectCrossOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";import { clearAdminSession } from "@/lib/auth";
export async function POST(req: Request){const rejected = rejectCrossOrigin(req); if (rejected) return rejected;await clearAdminSession();return NextResponse.json({ok:true});}
