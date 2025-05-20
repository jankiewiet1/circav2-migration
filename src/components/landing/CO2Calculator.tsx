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
import { Info } from 'lucide-react';
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

  // Pie chart data
  const pieData = {
    labels: categoryResults.map(c => c.category),
    datasets: [
      {
        data: categoryResults.map(c => c.total),
        backgroundColor: [
          '#4ade80', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#34d399', '#facc15', '#38bdf8', '#f472b6',
        ],
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cat.options.map(opt => {
              // Derive translation key from the option label based on category
              let translationKey = '';
              if (step === 0) { // Electricity
                if (opt.label.includes('Grijze stroom')) {
                  translationKey = 'calculator.grayElectricity';
                } else if (opt.label.includes('Groene stroom uit buitenland')) {
                  translationKey = 'calculator.greenElectricity';
                } else if (opt.label.includes('Nederlandse wind en zon')) {
                  translationKey = 'calculator.dutchWindSolar';
                } else if (opt.label.includes('biomassa')) {
                  translationKey = 'calculator.biomassElectricity';
                }
              } else if (step === 1) { // Heating
                if (opt.label.includes('Stadsverwarming')) {
                  translationKey = 'calculator.districtHeating';
                } else if (opt.label.includes('Aardgas')) {
                  translationKey = 'calculator.naturalGas';
                } else if (opt.label.includes('Stookolie')) {
                  translationKey = 'calculator.heatingOil';
                } else if (opt.label.includes('Geothermie')) {
                  translationKey = 'calculator.geothermal';
                } else if (opt.label.includes('Propaan')) {
                  translationKey = 'calculator.propane';
                } else if (opt.label.includes('Groengas')) {
                  translationKey = 'calculator.biogas';
                }
              } else if (step === 2) { // Business Transport
                if (opt.label === 'Diesel') {
                  translationKey = 'calculator.diesel';
                } else if (opt.label === 'Benzine') {
                  translationKey = 'calculator.petrol';
                } else if (opt.label === 'LPG') {
                  translationKey = 'calculator.lpg';
                } else if (opt.label.includes('CNG')) {
                  translationKey = 'calculator.cng';
                } else if (opt.label.includes('Elektrisch (met groene stroom)')) {
                  translationKey = 'calculator.electricGreen';
                } else if (opt.label.includes('Elektrisch (met grijze stroom)')) {
                  translationKey = 'calculator.electricGray';
                } else if (opt.label.includes('Trein')) {
                  translationKey = 'calculator.train';
                } else if (opt.label === 'Bus') {
                  translationKey = 'calculator.bus';
                } else if (opt.label.includes('Metro/Tram')) {
                  translationKey = 'calculator.metroTram';
                } else if (opt.label.includes('Waterstof grijs')) {
                  translationKey = 'calculator.hydrogenGray';
                }
              } else if (step === 3) { // Flights
                if (opt.label.includes('-2.500 km')) {
                  translationKey = 'calculator.shortHaulFlight';
                } else if (opt.label.includes('2.500+ km')) {
                  translationKey = 'calculator.longHaulFlight';
                }
              } else {
                // For other categories, we'll use the original label for now
                translationKey = '';
              }
              
              const displayLabel = translationKey ? t(translationKey) : opt.label;
              
              return (
                <div key={opt.label} className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-2">
                      <label className="block font-medium mb-1">{displayLabel}</label>
                      <Input
                        type="number"
                        min={0}
                        value={inputs[opt.label]?.amount}
                        onChange={e => handleInput(opt.label, e.target.value)}
                        className="max-w-[120px] inline-block mr-2"
                        placeholder="0"
                      />
                      <span className="ml-2 text-gray-500">{opt.unit}</span>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-sm">{t('calculator.factor')}: <b>{opt.factor}</b> kg CO₂e/{opt.unit}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-blue-500 cursor-help flex items-center"><Info className="w-4 h-4" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('calculator.emissionFactorSource')}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-sm">{t('calculator.co2emissions')}: <b>{((parseFloat(inputs[opt.label]?.amount) || 0) * (opt.factor || 0)).toFixed(2)}</b> kg</span>
                    <span className="text-sm">{t('calculator.socialCost')}: <b>€ {(((parseFloat(inputs[opt.label]?.amount) || 0) * (opt.factor || 0)) * SOCIAL_COST_PER_KG).toFixed(2)}</b></span>
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
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('calculator.summary')}</h2>
        {!anyValueEntered ? (
          <div className="text-gray-500 text-center my-8">{t('calculator.pleaseEnterValue')}</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start w-full">
            {/* Pie Chart Section */}
            <div className="flex-1 flex justify-center items-center w-full md:max-w-[420px] mx-auto md:mx-0">
              <div className="w-full max-w-[380px]">
                <Pie data={pieData} />
              </div>
            </div>
            {/* Summary Cards Section */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-lg mb-3">{t('calculator.emissionsOverview')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.totalEmissions')}:</span>
                    <span className="font-medium">{totalCO2.toFixed(2)} kg CO₂e</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.totalSocialCost')}:</span>
                    <span className="font-medium">€ {totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.emissionsPerFTE')}:</span>
                    <span className="font-medium">{(totalCO2 / (fte || 1)).toFixed(2)} kg CO₂e</span>
                  </div>
                </div>
              </div>
              {companyName && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-lg mb-3">{t('calculator.companyInfo')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>{t('calculator.companyName')}:</span>
                      <span className="font-medium">{companyName}</span>
                    </div>
                    {companyAddress && (
                      <div className="flex justify-between items-center">
                        <span>{t('calculator.companyAddress')}:</span>
                        <span className="font-medium">{companyAddress}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span>{t('calculator.employees')}:</span>
                      <span className="font-medium">{fte} FTE</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-lg mb-3">{t('calculator.reductionTarget.title')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.reductionTarget.percentage')}:</span>
                    <span className="font-medium">{reductionTarget}% by {reductionYear}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.reductionTarget.current')}:</span>
                    <span className="font-medium">{totalCO2.toFixed(2)} kg CO₂e</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.reductionTarget.target')}:</span>
                    <span className="font-medium">{targetEmissions.toFixed(2)} kg CO₂e</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('calculator.reductionTarget.required')}:</span>
                    <span className="font-medium">{(totalCO2 - targetEmissions).toFixed(2)} kg CO₂e</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-lg mb-3">{t('calculator.recommendations')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('calculator.recommendationSubtitle')}</p>
                <ReductionTips categoryResults={categoryResults} />
                {!submitted && (
                  <div className="mt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block font-medium mb-1">{t('calculator.emailReport')}</label>
                        <Input 
                          type="email" 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                          placeholder="your.email@example.com" 
                          className="w-full"
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-circa-green hover:bg-circa-green-dark"
                      >
                        {t('calculator.sendReport')}
                      </Button>
                    </form>
                  </div>
                )}
                {submitted && (
                  <div className="mt-6">
                    <div className="bg-green-50 text-green-800 p-4 rounded">
                      <p className="font-medium">{t('calculator.thankYou')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="max-w-[1200px] w-full mx-auto">
      <CardContent className="p-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((stepLabel, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`relative flex-1 text-xs md:text-sm p-2 text-center ${
                  i === step ? 'text-circa-green font-medium' : 'text-gray-400'
                }`}
              >
                {stepLabel}
              </button>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-circa-green h-2 transition-all duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-right text-xs mt-1 text-gray-500">
            {t('common.step', { current: step + 1, total: steps.length })}
          </div>
        </div>
        
        {/* Step Content */}
        {renderStep()}
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={goBack}
            disabled={step === 0}
          >
            {t('common.back')}
          </Button>
          <Button
            className="bg-circa-green hover:bg-circa-green-dark"
            onClick={goNext}
            disabled={step === steps.length - 1}
          >
            {t('common.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 