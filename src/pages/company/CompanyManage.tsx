import { useState, useEffect } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CompanyFormValues, CompanyMember, UserRole } from "@/types";
import { createCompanyInvitation, getCompanyMembers, updateCompanyMemberRole, deleteCompanyMember, resendCompanyInvitation, getCompanyInvitations, deleteCompanyInvitation } from "@/services/companyService";
import CompanyPreferencesTab from "@/pages/company/setup/tabs/CompanyPreferencesTab";

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const invitationStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

const companyFormSchema = z.object({
  name: z.string().min(2, {
    message: "Company name must be at least 2 characters.",
  }),
  industry: z.string().min(2, {
    message: "Industry must be at least 2 characters.",
  }),
  country: z.string().optional(),
  kvk_number: z.string().optional(),
  vat_number: z.string().optional(),
  iban: z.string().optional(),
  bank_name: z.string().optional(),
  billing_email: z.string().email().optional(),
  phone_number: z.string().optional(),
  billing_address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  contact_name: z.string().optional(),
  contact_title: z.string().optional(),
  contact_email: z.string().email().optional(),
})

export default function CompanyManage() {
  const { user } = useAuth();
  const { company, loading: companyLoading, updateCompany } = useCompany();
  const [isSaving, setIsSaving] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: company?.name || "",
      industry: company?.industry || "",
      country: company?.country || "",
      kvk_number: company?.kvk_number || "",
      vat_number: company?.vat_number || "",
      iban: company?.iban || "",
      bank_name: company?.bank_name || "",
      billing_email: company?.billing_email || "",
      phone_number: company?.phone_number || "",
      billing_address: company?.billing_address || "",
      postal_code: company?.postal_code || "",
      city: company?.city || "",
      contact_name: company?.contact_name || "",
      contact_title: company?.contact_title || "",
      contact_email: company?.contact_email || "",
    },
  })

  useEffect(() => {
    if (!company?.id) return;

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const members = await getCompanyMembers(company.id);
        setCompanyMembers(members);
      } catch (error) {
        console.error("Error fetching company members:", error);
        toast.error("Failed to load company members");
      } finally {
        setLoadingMembers(false);
      }
    };

    const fetchInvitations = async () => {
      setLoadingInvitations(true);
      try {
        const invitations = await getCompanyInvitations(company.id);
        setInvitations(invitations);
      } catch (error) {
        console.error("Error fetching company invitations:", error);
        toast.error("Failed to load company invitations");
      } finally {
        setLoadingInvitations(false);
      }
    };

    fetchMembers();
    fetchInvitations();
  }, [company?.id]);

  const handleRoleChange = async (memberId: string, role: UserRole) => {
    try {
      await updateCompanyMemberRole(memberId, role);
      setCompanyMembers(prev =>
        prev.map(member =>
          member.id === memberId ? { ...member, role } : member
        )
      );
      toast.success("Member role updated successfully");
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update member role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await deleteCompanyMember(memberId);
      setCompanyMembers(prev => prev.filter(member => member.id !== memberId));
      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendCompanyInvitation(invitationId);
      toast.success("Invitation resent successfully");
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await deleteCompanyInvitation(invitationId);
      setInvitations(prev => prev.filter(invitation => invitation.id !== invitationId));
      toast.success("Invitation cancelled successfully");
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const handleCreateInvitation = async (email: string, role: UserRole) => {
    try {
      const invitation = await createCompanyInvitation(company?.id || '', email, role, user?.id || '');
      setInvitations(prev => [...prev, invitation]);
      toast.success("Invitation sent successfully");
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Failed to create invitation");
    }
  };

  async function onSubmit(values: z.infer<typeof companyFormSchema>) {
    setIsSaving(true);
    try {
      if (!company) {
        throw new Error("Company not found");
      }
      await updateCompany({
        id: company.id,
        ...values,
      });
      toast.success("Company information updated successfully");
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast.error("Failed to update company information");
    } finally {
      setIsSaving(false);
    }
  }

  // Fix the CompanyPreferencesTab import and pass the companyId prop
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
          <p className="text-muted-foreground">
            Manage your company, team members, and settings.
          </p>
        </div>

        <Tabs defaultValue="team">
          <TabsList className="w-full border-b mb-8">
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="company">Company Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage your company's team members and their roles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <p>Loading team members...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Avatar>
                                  <AvatarImage src={`https://avatar.vercel.sh/${member.email}.png`} />
                                  <AvatarFallback>{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>{member.firstName} {member.lastName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(value) => handleRoleChange(member.id, value as UserRole)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invite New Member</CardTitle>
                  <CardDescription>
                    Invite a new member to your company.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InvitationForm onCreate={handleCreateInvitation} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>
                    Manage pending invitations to your company.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvitations ? (
                    <p>Loading invitations...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell>{invitation.role}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{invitation.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleResendInvitation(invitation.id)}>
                                Resend
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCancelInvitation(invitation.id)}>
                                Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Update your company's information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Corp" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <FormControl>
                              <Input placeholder="Technology" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="United States" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="kvk_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>KVK Number</FormLabel>
                            <FormControl>
                              <Input placeholder="12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vat_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>VAT Number</FormLabel>
                            <FormControl>
                              <Input placeholder="NL123456789B01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="iban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN</FormLabel>
                            <FormControl>
                              <Input placeholder="NL91ABNA0417164300" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input placeholder="ABN Amro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="billing_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Email</FormLabel>
                            <FormControl>
                              <Input placeholder="billing@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+15551234567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="billing_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contact_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Title</FormLabel>
                            <FormControl>
                              <Input placeholder="CEO" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Update Company Information"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <CompanyPreferencesTab companyId={company?.id || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

interface InvitationFormProps {
  onCreate: (email: string, role: UserRole) => Promise<void>;
}

const InvitationForm = ({ onCreate }: InvitationFormProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onCreate(email, role);
      setEmail("");
      setRole("viewer");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            placeholder="john.doe@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Invitation"}
      </Button>
    </form>
  );
};
