
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CompanyFormValues } from "@/types";

interface BillingInfoSectionProps {
  form: UseFormReturn<CompanyFormValues>;
  isEditing: boolean;
}

export function BillingInfoSection({ form, isEditing }: BillingInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Billing Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="billing_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Email</FormLabel>
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
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Address</FormLabel>
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
          name="postal_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
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
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
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
