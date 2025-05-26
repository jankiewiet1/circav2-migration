
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { SetupLayout } from "@/components/setup/SetupLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Plus, Trash2, UserRound } from "lucide-react";
import { CompanyMember, UserRole } from "@/types";

const userRoles: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "editor", "viewer"] as const),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function CompanyTeam() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { companyMembers, inviteMember, updateMemberRole, removeMember } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<CompanyMember | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<CompanyMember | null>(null);
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  const roleForm = useForm<{ role: UserRole }>({
    resolver: zodResolver(z.object({
      role: z.enum(["admin", "editor", "viewer"] as const),
    })),
    defaultValues: {
      role: "viewer",
    },
  });

  // Set the default role when editing a member
  useEffect(() => {
    if (memberToEdit) {
      roleForm.setValue("role", memberToEdit.role as UserRole);
    }
  }, [memberToEdit, roleForm]);

  const onInviteMember = async (data: InviteFormValues) => {
    setIsSubmitting(true);
    
    try {
      await inviteMember(data.email, data.role);
      form.reset();
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${data.email}`,
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: UserRole) => {
    try {
      await updateMemberRole(memberId, role);
      setMemberToEdit(null);
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      setMemberToRemove(null);
      toast({
        title: "Member Removed",
        description: "Team member has been removed successfully",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  const goBack = () => navigate("/company/setup/info");
  const goNext = () => navigate("/company/setup/preferences");

  return (
    <SetupLayout 
      currentStep={2} 
      totalSteps={3} 
      title="Team Members" 
      description="Manage who has access to your company's carbon accounting"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Team Members</CardTitle>
            <CardDescription>
              People who currently have access to your company data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No team members added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  companyMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user_id}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          member.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                          member.role === 'editor' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role === 'admin' ? 'Administrator' : 
                           member.role === 'editor' ? 'Editor' : 'Viewer'}
                        </span>
                      </TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMemberToEdit(member)}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                              <DialogDescription>
                                Update the permissions for this team member
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Form {...roleForm}>
                              <form onSubmit={roleForm.handleSubmit((data) => {
                                if (memberToEdit) {
                                  handleUpdateRole(memberToEdit.id, data.role);
                                }
                              })}>
                                <FormField
                                  control={roleForm.control}
                                  name="role"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Role</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {userRoles.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                              {role.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <DialogFooter className="mt-4">
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button type="submit">Save Changes</Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => setMemberToRemove(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this team member? 
                                They will lose all access to your company's carbon accounting data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => memberToRemove && handleRemoveMember(memberToRemove.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite New Team Member</CardTitle>
            <CardDescription>
              Send invitations to colleagues to join your carbon accounting team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInviteMember)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="colleague@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {userRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="mt-2"
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous Step
          </Button>
          
          <Button
            className="bg-circa-green hover:bg-circa-green-dark"
            onClick={goNext}
          >
            Next Step
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </SetupLayout>
  );
}
