import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@supabase/supabase-js';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Form validation schemas
const basicInfoSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const companyDetailsSchema = z.object({
  companyName: z.string().min(1, { message: 'Company name is required' }),
  companySize: z.string().min(1, { message: 'Company size is required' }),
  industry: z.string().min(1, { message: 'Industry is required' }),
  companyWebsite: z.string().url({ message: 'Invalid URL' }).or(z.string().length(0)),
  companyAddress: z.string().min(1, { message: 'Company address is required' })
});

const sustainabilityGoalsSchema = z.object({
  regulatoryCompliance: z.boolean().optional(),
  carbonReduction: z.boolean().optional(),
  sustainableSupplyChain: z.boolean().optional(),
  stakeholderReporting: z.boolean().optional(),
  other: z.boolean().optional(),
  otherGoals: z.string().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' })
  })
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;
type CompanyDetailsFormData = z.infer<typeof companyDetailsSchema>;
type SustainabilityGoalsFormData = z.infer<typeof sustainabilityGoalsSchema>;

export type SignUpFormData = BasicInfoFormData & CompanyDetailsFormData & SustainabilityGoalsFormData;

export default function SignUpForm() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<string>('basicInfo');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SignUpFormData>>({});

  // Basic Info Form
  const basicInfoForm = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  // Company Details Form
  const companyDetailsForm = useForm<CompanyDetailsFormData>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyName: '',
      companySize: '',
      industry: '',
      companyWebsite: '',
      companyAddress: ''
    }
  });

  // Sustainability Goals Form
  const sustainabilityGoalsForm = useForm<SustainabilityGoalsFormData>({
    resolver: zodResolver(sustainabilityGoalsSchema),
    defaultValues: {
      regulatoryCompliance: false,
      carbonReduction: false,
      sustainableSupplyChain: false,
      stakeholderReporting: false,
      other: false,
      otherGoals: '',
      termsAccepted: false
    }
  });

  const handleBasicInfoSubmit = (data: BasicInfoFormData) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep('companyDetails');
  };

  const handleCompanyDetailsSubmit = (data: CompanyDetailsFormData) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep('sustainabilityGoals');
  };

  const handleSustainabilityGoalsSubmit = async (data: SustainabilityGoalsFormData) => {
    setSubmitting(true);
    setError(null);
    
    const completeFormData = {
      ...formData,
      ...data
    } as SignUpFormData;
    
    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: completeFormData.email,
        password: completeFormData.password,
        options: {
          data: {
            first_name: completeFormData.firstName,
            last_name: completeFormData.lastName
          }
        }
      });
      
      if (authError) throw authError;
      
      // 2. Add user to waitlist
      const { error: waitlistError } = await supabase
        .from('waitlist')
        .insert({
          user_id: authData.user?.id,
          email: completeFormData.email,
          first_name: completeFormData.firstName,
          last_name: completeFormData.lastName,
          company_name: completeFormData.companyName,
          company_size: completeFormData.companySize,
          industry: completeFormData.industry,
          company_website: completeFormData.companyWebsite,
          company_address: completeFormData.companyAddress,
          goals: {
            regulatory_compliance: completeFormData.regulatoryCompliance,
            carbon_reduction: completeFormData.carbonReduction,
            sustainable_supply_chain: completeFormData.sustainableSupplyChain,
            stakeholder_reporting: completeFormData.stakeholderReporting,
            other: completeFormData.other,
            other_details: completeFormData.otherGoals
          },
          status: 'pending'
        });
        
      if (waitlistError) throw waitlistError;
      
      setSuccess(true);
    } catch (error: any) {
      console.error('Error during sign up:', error);
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">{t('signup.waitlistSuccess')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-gray-700 mb-6">
            Thanks for signing up! We'll notify you as soon as your account is ready.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Homepage
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">{t('signup.title')}</CardTitle>
        <CardDescription className="text-center">{t('signup.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs value={currentStep} onValueChange={setCurrentStep}>
          <TabsList className="w-full mb-6">
            <TabsTrigger
              value="basicInfo"
              className="flex-1"
              disabled={currentStep !== 'basicInfo'}
            >
              {t('signup.basicInfo')}
            </TabsTrigger>
            <TabsTrigger
              value="companyDetails"
              className="flex-1"
              disabled={currentStep === 'basicInfo' || currentStep === 'success'}
            >
              {t('signup.companyDetails')}
            </TabsTrigger>
            <TabsTrigger
              value="sustainabilityGoals"
              className="flex-1"
              disabled={currentStep === 'basicInfo' || currentStep === 'companyDetails' || currentStep === 'success'}
            >
              {t('signup.sustainabilityGoals')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="basicInfo">
            <form onSubmit={basicInfoForm.handleSubmit(handleBasicInfoSubmit)}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('signup.firstName')}</Label>
                    <Input
                      id="firstName"
                      {...basicInfoForm.register('firstName')}
                    />
                    {basicInfoForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">
                        {basicInfoForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('signup.lastName')}</Label>
                    <Input
                      id="lastName"
                      {...basicInfoForm.register('lastName')}
                    />
                    {basicInfoForm.formState.errors.lastName && (
                      <p className="text-sm text-red-500">
                        {basicInfoForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('common.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...basicInfoForm.register('email')}
                  />
                  {basicInfoForm.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {basicInfoForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">{t('common.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    {...basicInfoForm.register('password')}
                  />
                  {basicInfoForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {basicInfoForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...basicInfoForm.register('confirmPassword')}
                  />
                  {basicInfoForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {basicInfoForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button type="submit">{t('common.next')}</Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="companyDetails">
            <form onSubmit={companyDetailsForm.handleSubmit(handleCompanyDetailsSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('signup.companyName')}</Label>
                  <Input
                    id="companyName"
                    {...companyDetailsForm.register('companyName')}
                  />
                  {companyDetailsForm.formState.errors.companyName && (
                    <p className="text-sm text-red-500">
                      {companyDetailsForm.formState.errors.companyName.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companySize">{t('signup.companySize')}</Label>
                  <Select
                    onValueChange={(value) => companyDetailsForm.setValue('companySize', value)}
                    defaultValue={companyDetailsForm.getValues('companySize')}
                  >
                    <SelectTrigger id="companySize">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="501-1000">501-1000 employees</SelectItem>
                      <SelectItem value="1001+">1001+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                  {companyDetailsForm.formState.errors.companySize && (
                    <p className="text-sm text-red-500">
                      {companyDetailsForm.formState.errors.companySize.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">{t('signup.industry')}</Label>
                  <Select
                    onValueChange={(value) => companyDetailsForm.setValue('industry', value)}
                    defaultValue={companyDetailsForm.getValues('industry')}
                  >
                    <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="agriculture">Agriculture</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {companyDetailsForm.formState.errors.industry && (
                    <p className="text-sm text-red-500">
                      {companyDetailsForm.formState.errors.industry.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website (Optional)</Label>
                  <Input
                    id="companyWebsite"
                    {...companyDetailsForm.register('companyWebsite')}
                    placeholder="https://example.com"
                  />
                  {companyDetailsForm.formState.errors.companyWebsite && (
                    <p className="text-sm text-red-500">
                      {companyDetailsForm.formState.errors.companyWebsite.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Textarea
                    id="companyAddress"
                    {...companyDetailsForm.register('companyAddress')}
                  />
                  {companyDetailsForm.formState.errors.companyAddress && (
                    <p className="text-sm text-red-500">
                      {companyDetailsForm.formState.errors.companyAddress.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setCurrentStep('basicInfo')}>
                  {t('common.back')}
                </Button>
                <Button type="submit">{t('common.next')}</Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="sustainabilityGoals">
            <form onSubmit={sustainabilityGoalsForm.handleSubmit(handleSustainabilityGoalsSubmit)}>
              <div className="space-y-4">
                <Label>{t('signup.goals')}</Label>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="regulatoryCompliance"
                      checked={sustainabilityGoalsForm.watch('regulatoryCompliance')}
                      onCheckedChange={(checked) => 
                        sustainabilityGoalsForm.setValue('regulatoryCompliance', checked as boolean)
                      }
                    />
                    <div>
                      <Label htmlFor="regulatoryCompliance" className="cursor-pointer">
                        Regulatory Compliance (CDP, CSRD, TCFD)
                      </Label>
                      <p className="text-sm text-gray-500">Meet reporting requirements for various regulations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="carbonReduction"
                      checked={sustainabilityGoalsForm.watch('carbonReduction')}
                      onCheckedChange={(checked) => 
                        sustainabilityGoalsForm.setValue('carbonReduction', checked as boolean)
                      }
                    />
                    <div>
                      <Label htmlFor="carbonReduction" className="cursor-pointer">
                        Carbon Reduction Targets
                      </Label>
                      <p className="text-sm text-gray-500">Set and track science-based targets</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="sustainableSupplyChain"
                      checked={sustainabilityGoalsForm.watch('sustainableSupplyChain')}
                      onCheckedChange={(checked) => 
                        sustainabilityGoalsForm.setValue('sustainableSupplyChain', checked as boolean)
                      }
                    />
                    <div>
                      <Label htmlFor="sustainableSupplyChain" className="cursor-pointer">
                        Sustainable Supply Chain
                      </Label>
                      <p className="text-sm text-gray-500">Measure and reduce scope 3 emissions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="stakeholderReporting"
                      checked={sustainabilityGoalsForm.watch('stakeholderReporting')}
                      onCheckedChange={(checked) => 
                        sustainabilityGoalsForm.setValue('stakeholderReporting', checked as boolean)
                      }
                    />
                    <div>
                      <Label htmlFor="stakeholderReporting" className="cursor-pointer">
                        Stakeholder Reporting
                      </Label>
                      <p className="text-sm text-gray-500">Generate reports for investors, customers, and partners</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="other"
                      checked={sustainabilityGoalsForm.watch('other')}
                      onCheckedChange={(checked) => {
                        sustainabilityGoalsForm.setValue('other', checked as boolean);
                        if (!checked) {
                          sustainabilityGoalsForm.setValue('otherGoals', '');
                        }
                      }}
                    />
                    <div className="flex-1">
                      <Label htmlFor="other" className="cursor-pointer">
                        Other Goals
                      </Label>
                      {sustainabilityGoalsForm.watch('other') && (
                        <Textarea
                          id="otherGoals"
                          className="mt-2"
                          placeholder="Please specify"
                          {...sustainabilityGoalsForm.register('otherGoals')}
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="termsAccepted"
                      checked={sustainabilityGoalsForm.watch('termsAccepted')}
                      onCheckedChange={(checked) => 
                        sustainabilityGoalsForm.setValue('termsAccepted', checked as boolean)
                      }
                    />
                    <div>
                      <Label htmlFor="termsAccepted" className="cursor-pointer">
                        I agree to the Terms of Service and Privacy Policy
                      </Label>
                      {sustainabilityGoalsForm.formState.errors.termsAccepted && (
                        <p className="text-sm text-red-500">
                          {sustainabilityGoalsForm.formState.errors.termsAccepted.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setCurrentStep('companyDetails')}>
                  {t('common.back')}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : t('signup.joinWaitlist')}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6">
        <Button variant="ghost" asChild>
          <a href="/auth/login">Already have an account? Log in</a>
        </Button>
      </CardFooter>
    </Card>
  );
} 