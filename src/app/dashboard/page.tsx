import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/libs/authOptions";

export default async function DashboardIndexPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.rol === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (session.user.rol === "VENDEDOR") {
    redirect("/dashboard/vendedor");
  }

  redirect("/");
}
