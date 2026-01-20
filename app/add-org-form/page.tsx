import { AddOrganizationForm } from "@/components/add-organization-form";
import { createClient } from "@/lib/supabase/server";

export default async function AddOrgFormPage() {
  const supabase = await createClient();

  const { data: accountOwners } = await supabase
    .from("users")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })
    .limit(100);

  return (
    <div className="max-w-6xl mx-auto">
      <AddOrganizationForm accountOwners={accountOwners ?? []} />
    </div>
  );
}


