
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CompanyFormValues } from "@/types";

interface BankingInfoSectionProps {
  form: UseFormReturn<CompanyFormValues>;
  isEditing: boolean;
}

export function BankingInfoSection({ form, isEditing }: BankingInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Banking Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="bank_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
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
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN</FormLabel>
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
