
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CompanyFormValues } from "@/types";

interface ContactInfoSectionProps {
  form: UseFormReturn<CompanyFormValues>;
  isEditing: boolean;
}

export function ContactInfoSection({ form, isEditing }: ContactInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contact Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
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
                <Input 
                  {...field} 
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
