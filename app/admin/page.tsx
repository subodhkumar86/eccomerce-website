import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminDashboard from "@/components/admin-dashboard";
export const dynamic="force-dynamic";
export const metadata={title:"Admin studio | Veloura",robots:{index:false,follow:false}};
export default async function AdminPage(){if(!await getAdminSession())redirect("/admin/login");return <AdminDashboard/>}
