import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { useCompany } from "@/contexts/CompanyContext";
import { CompanyFormValues } from "@/types";
import { useEffect } from "react";
import { ContactInfoSection } from '@/components/company/setup/tabs/ContactInfoSection';
import { BusinessInfoSection } from '@/components/company/setup/tabs/BusinessInfoSection';
import { BankingInfoSection } from '@/components/company/setup/tabs/BankingInfoSection';
import { BillingInfoSection } from '@/components/company/setup/tabs/BillingInfoSection';

const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string(),
  country: z.string().optional(),
  kvk_number: z.string().optional(),
  vat_number: z.string().optional(),
  iban: z.string().optional(),
  bank_name: z.string().optional(),
  billing_email: z.string().email().optional().or(z.string().length(0)),
  phone_number: z.string().optional(),
  billing_address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  contact_name: z.string().optional(),
  contact_title: z.string().optional(),
  contact_email: z.string().email().optional().or(z.string().length(0)),
});

interface CompanyInfoTabProps {
  onSave: () => void;
}

export default function CompanyInfoTab({ onSave }: CompanyInfoTabProps) {
  const { company, updateCompany } = useCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
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
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        industry: company.industry || "",
        country: company.country || "",
        kvk_number: company.kvk_number || "",
        vat_number: company.vat_number || "",
        iban: company.iban || "",
        bank_name: company.bank_name || "",
        billing_email: company.billing_email || "",
        phone_number: company.phone_number || "",
        billing_address: company.billing_address || "",
        postal_code: company.postal_code || "",
        city: company.city || "",
        contact_name: company.contact_name || "",
        contact_title: company.contact_title || "",
        contact_email: company.contact_email || "",
      });
    }
  }, [company, form]);

  const onSubmit = async (values: CompanyFormValues) => {
    try {
      await updateCompany(values);
      onSave(); // Call the parent component's onSave function
    } catch (error) {
      console.error("Error updating company:", error);
    }
  };

  return (
    <Form {...form}>
      <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ContactInfoSection form={form} isEditing={true} />
        <BusinessInfoSection form={form} isEditing={true} />
        <BankingInfoSection form={form} isEditing={true} />
        <BillingInfoSection form={form} isEditing={true} />
      </form>
    </Form>
  );
}
