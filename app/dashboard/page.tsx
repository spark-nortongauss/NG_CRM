import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Welcome to Norton-Gauss CRM
          </h1>
          <p className="text-lg text-gray-600">
            You are successfully logged in as{" "}
            <span className="font-semibold">{user.email}</span>
          </p>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="mt-8">
            Logout
          </Button>
        </form>
      </div>
    </div>
  );
}
