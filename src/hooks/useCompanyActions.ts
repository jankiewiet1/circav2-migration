
import { useCallback } from "react";
import { Company, UserRole } from "@/types";
import { toast } from "@/components/ui/sonner";
import {
  createCompanyService,
  updateCompanyService,
  inviteMemberService,
  updateMemberRoleService,
  removeMemberService
} from "@/services/companyService";

export const useCompanyActions = (userId: string | undefined, companyId: string | undefined) => {
  const createCompany = useCallback(async (name: string, industry: string) => {
    if (!userId) return { error: new Error('User not authenticated'), company: null };
    
    const { error, company } = await createCompanyService(name, industry, userId);
    
    if (error) {
      toast.error(error.message || "An unexpected error occurred");
    } else if (company) {
      toast.success(`${company.name} has been successfully created`);
    }
    
    return { error, company };
  }, [userId]);

  const updateCompany = useCallback(async (data: Partial<Company>) => {
    if (!companyId) return { error: new Error('No company found') };
    
    const { error } = await updateCompanyService(companyId, data);
    
    if (error) {
      toast.error(error.message || "Failed to update company details");
    } else {
      toast.success("Company details have been updated successfully");
    }
    
    return { error };
  }, [companyId]);

  const inviteMember = useCallback(async (email: string, role: UserRole) => {
    if (!companyId || !userId) {
      return { error: new Error('Missing company or user information') };
    }
    
    const { error } = await inviteMemberService(companyId, email, role, userId);
    
    if (error) {
      toast.error(error.message || "Failed to send invitation");
    } else {
      toast.success(`Invitation has been sent to ${email}`);
    }
    
    return { error };
  }, [companyId, userId]);

  const updateMemberRole = useCallback(async (memberId: string, role: UserRole) => {
    const { error } = await updateMemberRoleService(memberId, role);
    
    if (error) {
      toast.error(error.message || "Failed to update member role");
    } else {
      toast.success("Member role has been updated successfully");
    }
    
    return { error };
  }, []);

  const removeMember = useCallback(async (memberId: string) => {
    const { error } = await removeMemberService(memberId);
    
    if (error) {
      toast.error(error.message || "Failed to remove member");
    } else {
      toast.success("Member has been removed from the company");
    }
    
    return { error };
  }, []);

  return {
    createCompany,
    updateCompany,
    inviteMember,
    updateMemberRole,
    removeMember
  };
};
