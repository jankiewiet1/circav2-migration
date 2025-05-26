import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { SetupLayout } from "@/components/setup/SetupLayout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowRight } from "lucide-react";

const industries = [ /* your industries array */ ];
const countries = [ /* your countries array */ ];

const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  country: z.string().min(1, "Country is required"),
  kvkNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  iban: z.string().optional(),
  bankName: z.string().optional(),
  billingEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  contactName: z.string().optional(),
  contactTitle: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function CompanyInfo() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { company, updateCompany, createCompany } = useCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // If no company, start in edit mode

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: company?.name || "",
      industry: company?.industry || "",
      country: company?.country || "",
      kvkNumber: company?.kvk_number || "",
      vatNumber: company?.vat_number || "",
      iban: company?.iban || "",
      bankName: company?.bank_name || "",
      billingEmail: company?.billing_email || "",
      phoneNumber: company?.phone_number || "",
      billingAddress: company?.billing_address || "",
      postalCode: company?.postal_code || "",
      city: company?.city || "",
      contactName: company?.contact_name || "",
      contactTitle: company?.contact_title || "",
      contactEmail: company?.contact_email || "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      if (company) {
        await updateCompany({ ...data });
        toast({
          title: "Company Updated",
          description: "Company information saved successfully.",
        });
        setIsEditing(false);
      } else {
        const result = await createCompany(data.name, data.industry);
        if (result.company) {
          await updateCompany({ ...data });
          navigate("/company/setup/team");
        }
      }
    } catch (error) {
      console.error("Error saving company info:", error);
      toast({
        title: "Error",
        description: "Failed to save company information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (
    name: keyof FormValues,
    label: string,
    placeholder: string,
    type: string = "text"
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              readOnly={!isEditing}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <SetupLayout
      currentStep={1}
      totalSteps={3}
      title="Company Information"
      description="Set up your company details for carbon accounting"
    >
      <div className="flex justify-end mb-4">
  {!isEditing ? (
    <Button onClick={() => setIsEditing(true)}>Edit Company</Button>
  ) : (
    <div className="flex gap-2">
       <Button
          type="submit"
           form="companyForm"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
         <Button
          type="button"
          variant="outline"
          onClick={() => {
               setIsEditing(false);       // Exit edit mode
              form.reset();              // Reset the form to last saved state
             }}
          >
            Cancel
           </Button>
         </div>
       )}
     </div>
      
      <Form {...form}>
        <form
          id="companyForm"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField("name", "Company Name", "Enter your company name")}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add similar sections using renderField() or inline like above: */}
          <Card>
            <CardHeader><CardTitle>Financial Info</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {renderField("kvkNumber", "KVK Number", "")}
              {renderField("vatNumber", "VAT Number", "")}
              {renderField("iban", "IBAN", "")}
              {renderField("bankName", "Bank Name", "")}
              {renderField("billingEmail", "Billing Email", "")}
              {renderField("phoneNumber", "Phone Number", "")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {renderField("billingAddress", "Street", "")}
              {renderField("postalCode", "Postal Code", "")}
              {renderField("city", "City", "")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Primary Contact</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {renderField("contactName", "Contact Name", "")}
              {renderField("contactTitle", "Contact Title", "")}
              {renderField("contactEmail", "Contact Email", "")}
            </CardContent>
          </Card>
        </form>
      </Form>
    </SetupLayout>
  );
}

