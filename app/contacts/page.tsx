import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default async function ContactsPage() {
  const supabase = await createClient();

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contacts:", error);
    return <div>Error loading contacts</div>;
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableCaption>A list of your contacts.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">First Name</TableHead>
              <TableHead className="whitespace-nowrap">Last Name</TableHead>
              <TableHead className="whitespace-nowrap">Organization</TableHead>
              <TableHead className="whitespace-nowrap">Mobile 1</TableHead>
              <TableHead className="whitespace-nowrap">Mobile 2</TableHead>
              <TableHead className="whitespace-nowrap">Mobile 3</TableHead>
              <TableHead className="whitespace-nowrap">Fixed Number</TableHead>
              <TableHead className="whitespace-nowrap">Email 1</TableHead>
              <TableHead className="whitespace-nowrap">Email 2</TableHead>
              <TableHead className="whitespace-nowrap">Email 3</TableHead>
              <TableHead className="whitespace-nowrap">City</TableHead>
              <TableHead className="whitespace-nowrap">State</TableHead>
              <TableHead className="whitespace-nowrap">Country</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Contact Date</TableHead>
              <TableHead className="whitespace-nowrap">Contacted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts?.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {contact.first_name || "-"}
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {contact.last_name || "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">{contact.organization || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.mobile_1 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.mobile_2 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.mobile_3 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.fixed_number || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.email_1 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.email_2 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.email_3 || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.city || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.state || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{contact.country || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    contact.contact_status === 'Call' ? 'bg-green-100 text-green-700' :
                    contact.contact_status === 'Email' ? 'bg-blue-100 text-blue-700' :
                    contact.contact_status === 'LinkedIn' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {contact.contact_status || "Not Contacted"}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {contact.contact_date ? format(new Date(contact.contact_date), "PP") : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {contact.contacted ? (
                    <span className="text-green-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {contacts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={16} className="text-center py-8 text-gray-500">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
