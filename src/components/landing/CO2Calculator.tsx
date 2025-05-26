import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Pie } from 'react-chartjs-2';
import emissionFactors from '@/data/emissionFactors.json';
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import ReductionTips from './ReductionTips';
import { sendCO2SummaryEmail } from '@/services/emailService';
import { Info, CheckCircle2, Sparkles } from 'lucide-react';
Chart.register(ArcElement, ChartTooltip, Legend);

const SOCIAL_COST_PER_KG = 0.7;

type InputState = Record<string, { amount: string, unit: string, factor: number }>;

function getDefaultInputs(): InputState {
  const inputs: InputState = {};
  emissionFactors.forEach(cat => {
    cat.options.forEach(opt => {
      inputs[opt.label] = { amount: '', unit: opt.unit, factor: opt.factor };
    });
  });
  return inputs;
}

export default function CO2Calculator() {
  const { t } = useTranslation();
  
  const steps = [
    t('calculator.electricity'),
    t('calculator.heating'),
    t('calculator.businessTransport'),
    t('calculator.flights'),
    t('calculator.companyInfo'),
    t('calculator.summary'),
  ];

  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<InputState>(getDefaultInputs());
  const [email, setEmail] = useState('');
  const [fte, setFte] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [reductionTarget, setReductionTarget] = useState(5);
  const [reductionYear, setReductionYear] = useState(new Date().getFullYear() + 1);

  // Calculate per-category and total emissions
  const categoryResults = emissionFactors.map(cat => {
    let total = 0;
    cat.options.forEach(opt => {
      const val = parseFloat(inputs[opt.label]?.amount) || 0;
      total += val * (opt.factor || 0);
    });
    return { category: cat.category, total };
  });
  const totalCO2 = categoryResults.reduce((sum, c) => sum + c.total, 0);
  const totalCost = totalCO2 * SOCIAL_COST_PER_KG;

  // Calculate target emissions after reduction
  const targetEmissions = totalCO2 * (1 - (reductionTarget / 100));

  // Check if any value is entered
  const anyValueEntered = Object.values(inputs).some(i => i.amount && parseFloat(i.amount) > 0);

  // Circa color palette
  const CIRCA_COLORS = [
    '#0E5D40', // Green
    '#FBBF24', // Yellow
    '#60A5FA', // Blue
    '#F47216', // Orange
  ];

  // Pie chart data
  const pieData = {
    labels: categoryResults.map(c => c.category),
    datasets: [
      {
        data: categoryResults.map(c => c.total),
        backgroundColor: categoryResults.map((_, i) => CIRCA_COLORS[i % CIRCA_COLORS.length]),
      },
    ],
  };

  // Step navigation
  const goNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  // Handle input change
  const handleInput = (label: string, value: string) => {
    setInputs(prev => ({ ...prev, [label]: { ...prev[label], amount: value } }));
  };

  // Handle email submit (simulate API/send)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    try {
      await sendCO2SummaryEmail({
        email,
        name: companyName || undefined, // Use company name as "name" if provided
        company: companyName,
        phone: '',
        companyAddress: companyAddress,
        companyFTE: fte,
        reductionTarget: reductionTarget,
        reductionYear: reductionYear,
        targetEmissions: targetEmissions,
        summary: {
          totalCO2,
          totalCost,
          categoryResults
        }
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // Potentially show an error toast here
    }
  };

  // Step content
  const renderStep = () => {
    if (step < emissionFactors.length) {
      const cat = emissionFactors[step];
      const categoryKey = steps[step]; // This is the translation key for the category
      
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{t(categoryKey)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cat.options.map((opt, index) => {
              // Map index directly to translation key based on category
              let translationKey = '';
              if (step === 0) { // Electricity
                const electricityKeys = ['calculator.grayElectricity', 'calculator.greenElectricity', 'calculator.dutchWindSolar', 'calculator.biomassElectricity'];
                translationKey = electricityKeys[index] || '';
              } else if (step === 1) { // Heating
                const heatingKeys = ['calculator.districtHeating', 'calculator.naturalGas', 'calculator.heatingOil', 'calculator.geothermal', 'calculator.propane', 'calculator.biogas'];
                translationKey = heatingKeys[index] || '';
              } else if (step === 2) { // Business Transport
                const transportKeys = ['calculator.diesel', 'calculator.petrol', 'calculator.lpg', 'calculator.cng', 'calculator.electricGreen', 'calculator.electricGray', 'calculator.train', 'calculator.bus', 'calculator.metroTram', 'calculator.hydrogenGray'];
                translationKey = transportKeys[index] || '';
              } else if (step === 3) { // Flights
                const flightKeys = ['calculator.shortHaulFlight', 'calculator.longHaulFlight'];
                translationKey = flightKeys[index] || '';
              }
              
              const displayLabel = translationKey ? t(translationKey) : opt.label;
              const value = parseFloat(inputs[opt.label]?.amount) || 0;
              const emissions = value * opt.factor;
              const cost = emissions * SOCIAL_COST_PER_KG;
              
              return (
                <div key={opt.label} className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <label className="block font-medium text-base">{displayLabel}</label>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-sm">
                        <span>Factor: <b>{opt.factor}</b></span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-blue-500 cursor-help flex items-center"><Info className="w-4 h-4" /></span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('calculator.emissionFactorSource')}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="text-xs text-gray-500">kg CO₂e/{opt.unit}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={inputs[opt.label]?.amount}
                      onChange={e => handleInput(opt.label, e.target.value)}
                      className="max-w-[160px] text-base"
                      placeholder="0"
                    />
                    <span className="text-gray-500">{opt.unit}</span>
                  </div>
                  
                  <div className="flex flex-col mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">CO₂ emissions:</span>
                      <span className="font-medium">{emissions.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Social cost:</span>
                      <span className="font-medium">€ {cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (step === emissionFactors.length) {
      // Company Info step
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{t('calculator.companyInfo')}</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block font-medium mb-1">{t('calculator.companyName')}</label>
                  <Input 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)} 
                    placeholder="Your company name" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{t('calculator.companyAddress')}</label>
                  <Input 
                    value={companyAddress} 
                    onChange={e => setCompanyAddress(e.target.value)} 
                    placeholder="Your company address" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">{t('calculator.employees')}</label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={fte} 
                    onChange={e => setFte(Number(e.target.value))} 
                    className="max-w-[120px]" 
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-lg mb-3">{t('calculator.reductionTarget.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">{t('calculator.reductionTarget.percentage')}</label>
                  <div className="flex items-center">
                    <Input 
                      type="number" 
                      min={1} 
                      max={100}
                      value={reductionTarget} 
                      onChange={e => setReductionTarget(Number(e.target.value))} 
                      className="max-w-[120px] mr-2" 
                    />
                    <span>%</span>
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">{t('calculator.reductionTarget.year')}</label>
                  <Input 
                    type="number" 
                    min={new Date().getFullYear()} 
                    value={reductionYear} 
                    onChange={e => setReductionYear(Number(e.target.value))} 
                    className="max-w-[120px]" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Summary step
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-circa-green h-7 w-7 animate-bounce" />
          {t('calculator.summary')}
        </h2>
        {!anyValueEntered ? (
          <div className="text-gray-500 text-center my-8">{t('calculator.pleaseEnterValue')}</div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row gap-8 items-stretch w-full">
              {/* Pie Chart Section */}
              <div className="flex-1 flex flex-col items-center justify-center w-full min-w-[260px] max-w-[420px] mx-auto lg:mx-0">
                <div className="w-full flex flex-col items-center">
                  <div className="relative z-10 bg-white rounded-full p-2 shadow-lg">
                    <Pie data={pieData} options={{ plugins: { legend: { display: false } } }} />
                  </div>
                  {/* Modern horizontal legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {pieData.labels.map((label, i) => (
                      <div key={label as string} className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: pieData.datasets[0].backgroundColor[i] }}></span>
                        <span className="font-semibold text-gray-700 text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <div className="flex-1 w-full">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-2xl mb-4 text-circa-green flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6" />
                    {t('calculator.emissionsOverview')}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Emissions Data */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-600">{t('calculator.totalEmissions')}</span>
                        <span className="font-bold text-gray-900">{totalCO2.toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-600">{t('calculator.totalSocialCost')}</span>
                        <span className="font-bold text-gray-900">€ {totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-600">{t('calculator.emissionsPerFTE')}</span>
                        <span className="font-bold text-gray-900">{(totalCO2 / (fte || 1)).toFixed(2)} kg</span>
                      </div>
                    </div>

                    {/* Company Info */}
                    {companyName && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-semibold text-lg mb-2">{t('calculator.companyInfo')}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{t('calculator.companyName')}</span>
                            <span className="font-medium">{companyName}</span>
                          </div>
                          {companyAddress && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">{t('calculator.companyAddress')}</span>
                              <span className="font-medium">{companyAddress}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{t('calculator.employees')}</span>
                            <span className="font-medium">{fte} FTE</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reduction Targets */}
                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="font-semibold text-lg mb-2">{t('calculator.reductionTarget.title')}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('calculator.reductionTarget.percentage')}</span>
                          <span className="font-medium">{reductionTarget}% by {reductionYear}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('calculator.reductionTarget.target')}</span>
                          <span className="font-medium">{targetEmissions.toFixed(2)} kg CO₂e</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('calculator.reductionTarget.required')}</span>
                          <span className="font-medium">{(totalCO2 - targetEmissions).toFixed(2)} kg CO₂e</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="w-full mt-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="mb-8">
                  <ReductionTips categoryResults={categoryResults} />
                </div>

                {/* Single Email Form */}
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center justify-center border-t border-gray-100 pt-6">
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="your.email@example.com" 
                      className="w-full sm:w-80 text-lg px-4 py-3 rounded-xl"
                      required
                    />
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto bg-circa-green hover:bg-circa-green-dark text-lg px-8 py-3 rounded-xl"
                    >
                      {t('calculator.sendReport')}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center border-t border-gray-100 pt-6">
                    <p className="font-medium text-lg text-green-700">{t('calculator.thankYou')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Title and subtitle above the card */}
      <h1 className="text-3xl md:text-4xl font-bold text-circa-green text-center mt-8 mb-2">{t('calculator.title')}</h1>
      <p className="text-lg text-gray-600 text-center mb-6">{t('calculator.subtitle')}</p>
      <Card className="w-full max-w-7xl mx-auto min-h-[540px] md:min-h-[600px]">
        <CardContent className="p-6">
          {/* Progress Steps */}
          <div className="mb-8 mt-2">
            <div className="flex items-center justify-between mb-2 relative">
              {/* Step labels */}
              <div className="flex w-full justify-between">
                {steps.map((stepLabel, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`relative min-w-[100px] text-sm px-2 text-center transition-colors duration-200 ${
                      i <= step ? 'text-circa-green font-medium' : 'text-gray-400'
                    }`}
                  >
                    {stepLabel}
                  </button>
                ))}
              </div>
            </div>
            {/* Classic thin progress bar */}
            <div className="w-full h-1.5 bg-gray-200 relative mt-1 mb-2">
              <div
                className="absolute left-0 top-0 h-full bg-circa-green transition-all duration-300"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500">
              {t('common.step', { current: step + 1, total: steps.length })}
            </div>
          </div>
          {/* Step Content with fade transition */}
          <div className="w-full min-h-[320px] md:min-h-[380px] transition-all duration-300">
            <div key={step} className="animate-fadein">
              {renderStep()}
            </div>
          </div>
          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between mt-8 gap-4 w-full">
            <Button
              onClick={goBack}
              disabled={step === 0}
              className="w-full sm:w-auto"
            >
              {t('common.back')}
            </Button>
            <Button
              className="bg-circa-green hover:bg-circa-green-dark w-full sm:w-auto"
              onClick={goNext}
              disabled={step === steps.length - 1}
            >
              {t('common.next')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 