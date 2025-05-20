import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle, Info, Check, ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/branding/Logo";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

// Progress indicator component
const ProgressSteps = ({ currentStep, totalSteps }) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div 
            key={i}
            className={`flex items-center justify-center w-8 h-8 rounded-full 
                     ${i < currentStep 
                         ? 'bg-circa-green text-white' 
                         : i === currentStep 
                           ? 'bg-white border-2 border-circa-green text-circa-green' 
                           : 'bg-gray-200 text-gray-500'}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="relative w-full h-2 bg-gray-200 rounded-full">
        <div 
          className="absolute top-0 left-0 h-full bg-circa-green rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>Personal Info</span>
        <span>Company Info</span>
        <span>Assessment</span>
      </div>
    </div>
  );
};

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Separate state for each form step
  const [personalData, setPersonalData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  
  const [companyData, setCompanyData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    website: "",
  });
  
  const [assessmentData, setAssessmentData] = useState({
    esgReportingHours: "",
    platformValue: "",
    motivations: [] as string[],
    additionalComments: "",
  });
  
  // Form validation schemas
  const personalInfoSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    phone: z.string().optional(),
  });
  
  const companyInfoSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required" }),
    industry: z.string().min(1, { message: "Please select an industry" }),
    companySize: z.string().min(1, { message: "Please select company size" }),
    website: z.string().optional(),
  });
  
  const needsAssessmentSchema = z.object({
    esgReportingHours: z.string().optional(),
    platformValue: z.string().optional(),
    motivations: z.array(z.string()).min(1, { message: "Please select at least one motivation" }),
    additionalComments: z.string().optional(),
  });
  
  // Create form controllers for each step
  const personalInfoForm = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: personalData
  });
  
  const companyInfoForm = useForm({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: companyData
  });
  
  const needsAssessmentForm = useForm({
    resolver: zodResolver(needsAssessmentSchema),
    defaultValues: assessmentData
  });
  
  // Initialize forms when their data changes
  useEffect(() => {
    personalInfoForm.reset(personalData);
  }, [personalData]);
  
  useEffect(() => {
    companyInfoForm.reset(companyData);
  }, [companyData]);
  
  useEffect(() => {
    needsAssessmentForm.reset(assessmentData);
  }, [assessmentData]);
  
  // Reset forms when step changes
  useEffect(() => {
    if (step === 0) {
      personalInfoForm.reset(personalData);
    } else if (step === 1) {
      companyInfoForm.reset(companyData);
    } else if (step === 2) {
      needsAssessmentForm.reset(assessmentData);
    }
  }, [step]);
  
  // Step navigation
  const nextStep = () => {
    if (step === 0) {
      personalInfoForm.handleSubmit((data) => {
        setPersonalData(data);
        setStep(1);
      })();
    } else if (step === 1) {
      companyInfoForm.handleSubmit((data) => {
        setCompanyData(data);
        setStep(2);
      })();
    }
  };
  
  const prevStep = () => {
    if (step === 1) {
      // Save current step data before going back
      const currentData = companyInfoForm.getValues();
      setCompanyData(currentData);
      setStep(0);
    } else if (step === 2) {
      // Save current step data before going back
      const currentData = needsAssessmentForm.getValues();
      setAssessmentData(currentData);
      setStep(1);
    }
  };
  
  // Industry options
  const industries = [
    { value: "agriculture", label: "Agriculture" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "technology", label: "Technology" },
    { value: "retail", label: "Retail" },
    { value: "healthcare", label: "Healthcare" },
    { value: "finance", label: "Finance" },
    { value: "energy", label: "Energy" },
    { value: "professional_services", label: "Professional Services" },
    { value: "transportation", label: "Transportation" },
    { value: "other", label: "Other" },
  ];
  
  // Company size options
  const companySizes = [
    { value: "1-10", label: "1-10 employees" },
    { value: "11-50", label: "11-50 employees" },
    { value: "51-200", label: "51-200 employees" },
    { value: "201-500", label: "201-500 employees" },
    { value: "501-1000", label: "501-1000 employees" },
    { value: "1000+", label: "1000+ employees" },
  ];
  
  // Motivation options
  const motivationOptions = [
    { value: "compliance", label: "Compliance with regulations" },
    { value: "reporting", label: "Improved ESG reporting" },
    { value: "sustainability", label: "Meeting sustainability goals" },
    { value: "cost_saving", label: "Cost saving" },
    { value: "customer_demand", label: "Customer demand" },
    { value: "competitive_advantage", label: "Competitive advantage" },
    { value: "other", label: "Other" },
  ];
  
  // Final submit function
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      // Save assessment data
      setAssessmentData(data);
      
      // Combine all form data
      const completeFormData = {
        ...personalData,
        ...companyData,
        ...data
      };
      
      // Process numeric values
      const processedData = {
        ...completeFormData,
        esgReportingHours: parseInt(completeFormData.esgReportingHours) || 0,
        platformValue: parseInt(completeFormData.platformValue) || 0,
      };
      
      // First create the lead record
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          first_name: processedData.firstName,
          last_name: processedData.lastName,
          email: processedData.email,
          phone: processedData.phone,
          company_name: processedData.companyName,
          industry: processedData.industry,
          company_size: processedData.companySize,
          website: processedData.website,
          esg_reporting_hours: processedData.esgReportingHours,
          platform_value_perception: processedData.platformValue,
          motivations: processedData.motivations,
          additional_comments: processedData.additionalComments,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (leadError) {
        throw leadError;
      }
      
      // Then create the user account
      const { error: signUpError } = await signUp(
        processedData.email, 
        processedData.password, 
        processedData.firstName, 
        processedData.lastName
      );
      
      if (signUpError) {
        throw signUpError;
      }
      
      // Success! Redirect to login with success message
      navigate("/auth/login", { 
        state: { 
          message: "Thank you for registering! Your account has been added to our waitlist. We'll review your application and get back to you soon." 
        } 
      });
      
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "An unexpected error occurred during registration");
    } finally {
      setLoading(false);
    }
  };
  
  // Render current step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Form {...personalInfoForm}>
            <form onSubmit={personalInfoForm.handleSubmit(nextStep)} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Personal Information</h2>
                <p className="text-sm text-gray-500">Tell us about yourself so we can contact you.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={personalInfoForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={personalInfoForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@company.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      <div className="flex items-center text-sm text-gray-500">
                        <Lock className="w-3 h-3 mr-1" />
                        Your data is securely stored and never shared.
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={personalInfoForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        autoComplete="new-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters long.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={personalInfoForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+31 6 12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" className="bg-circa-green hover:bg-circa-green-dark">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        );
        
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Company Information</h2>
              <p className="text-sm text-gray-500">Tell us about your organization.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input 
                id="companyName"
                placeholder="Enter your company name" 
                value={companyData.companyName}
                onChange={(e) => setCompanyData({
                  ...companyData,
                  companyName: e.target.value
                })}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  onValueChange={(value) => setCompanyData({
                    ...companyData,
                    industry: value
                  })}
                  value={companyData.industry}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map(industry => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  <Info className="w-3 h-3 inline mr-1" />
                  Helps us tailor our solution to your needs.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select
                  onValueChange={(value) => setCompanyData({
                    ...companyData,
                    companySize: value
                  })}
                  value={companyData.companySize}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map(size => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Company Website (optional)</Label>
              <Input 
                id="website"
                placeholder="https://yourcompany.com" 
                value={companyData.website}
                onChange={(e) => setCompanyData({
                  ...companyData,
                  website: e.target.value
                })}
              />
              <p className="text-xs text-gray-500">Enter your company website if you have one.</p>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                type="button" 
                className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300" 
                onClick={prevStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                type="button" 
                className="bg-circa-green hover:bg-circa-green-dark"
                disabled={!companyData.companyName || !companyData.industry || !companyData.companySize}
                onClick={nextStep}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Interest & Needs Assessment</h2>
              <p className="text-sm text-gray-500">Help us understand how we can best serve your needs.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="esgHours">How many hours per month do you spend on ESG reporting?</Label>
              <Input 
                id="esgHours"
                type="text" 
                inputMode="numeric"
                placeholder="Enter hours" 
                value={assessmentData.esgReportingHours}
                onChange={(e) => setAssessmentData({
                  ...assessmentData,
                  esgReportingHours: e.target.value
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platformValue">How much value (in euros) would an effective carbon accounting platform bring to your company per year?</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">€</span>
                <Input 
                  id="platformValue"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-8" 
                  value={assessmentData.platformValue}
                  onChange={(e) => setAssessmentData({
                    ...assessmentData,
                    platformValue: e.target.value
                  })}
                />
              </div>
              <p className="text-xs text-gray-500">This helps us understand the potential ROI for your business.</p>
            </div>
            
            <div className="space-y-2">
              <Label>What is your main motivation for using our service? (Select all that apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {motivationOptions.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={`motivation-${option.value}`}
                      checked={assessmentData.motivations.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAssessmentData({
                            ...assessmentData,
                            motivations: [...assessmentData.motivations, option.value]
                          });
                        } else {
                          setAssessmentData({
                            ...assessmentData,
                            motivations: assessmentData.motivations.filter(m => m !== option.value)
                          });
                        }
                      }}
                    />
                    <Label
                      htmlFor={`motivation-${option.value}`}
                      className="font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (optional)</Label>
              <Textarea 
                id="comments"
                placeholder="Tell us more about your specific needs or challenges..." 
                className="resize-none" 
                value={assessmentData.additionalComments}
                onChange={(e) => setAssessmentData({
                  ...assessmentData,
                  additionalComments: e.target.value
                })}
              />
            </div>
            
            <div className="flex justify-between mt-6">
              <Button 
                type="button" 
                className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300" 
                onClick={prevStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                type="button" 
                className="bg-circa-green hover:bg-circa-green-dark"
                disabled={loading || assessmentData.motivations.length === 0}
                onClick={() => handleSubmit(assessmentData)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Registration
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-circa-green-light px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Logo variant="dark" className="mx-auto" />
          <p className="text-gray-600 mt-2">Carbon accounting made simple</p>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Enter your details to get started with Circa</CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <ProgressSteps currentStep={step} totalSteps={3} />
            
            {renderStep()}
          </CardContent>
          
          <CardFooter className="flex flex-col">
            <p className="text-center text-sm mt-4">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-circa-green underline hover:text-circa-green-dark">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
