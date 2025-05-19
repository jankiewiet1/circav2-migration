import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import reductionTips from '@/data/reductionTips.json';
import { ArrowRightCircle, CheckCircle2, AlertCircle, Zap } from "lucide-react";

// Map impact and difficulty to colors
const impactColors = {
  high: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300'
};

const difficultyColors = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-orange-100 text-orange-800 border-orange-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300'
};

type CategoryResult = {
  category: string;
  total: number;
};

interface ReductionTipsProps {
  categoryResults: CategoryResult[];
}

export default function ReductionTips({ categoryResults }: ReductionTipsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(categoryResults[0]?.category || '');
  
  // Sort categories by emissions (highest first)
  const sortedCategories = [...categoryResults].sort((a, b) => b.total - a.total);
  
  const getRelevantTips = (category: string) => {
    return reductionTips.find(c => c.category === category)?.tips || [];
  };

  // Get the translation key for a category
  const getCategoryTranslationKey = (category: string) => {
    if (category === 'Elektriciteit') return 'calculator.electricity';
    if (category === 'Verwarming') return 'calculator.heating';
    if (category === 'Zakelijk vervoer') return 'calculator.businessTransport';
    if (category === 'Vliegreizen') return 'calculator.flights';
    return '';
  };

  // Get the translation key for a tip title
  const getTipTranslationKey = (category: string, title: string) => {
    // Derive a key based on category and a sanitized version of the title
    const categoryKey = category === 'Elektriciteit' ? 'electricity' :
                        category === 'Verwarming' ? 'heating' :
                        category === 'Zakelijk vervoer' ? 'businessTransport' :
                        category === 'Vliegreizen' ? 'flights' : '';
    
    // Simply return a descriptive key that can be added to translation files
    // Format: tips.{category}.{sanitizedTitle}
    const sanitizedTitle = title.toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove special chars
      .replace(/\s+/g, '');     // Remove spaces
    
    return `tips.${categoryKey}.${sanitizedTitle}`;
  };

  // Get the translation key for a tip description
  const getTipDescriptionKey = (category: string, title: string) => {
    return `${getTipTranslationKey(category, title)}.description`;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">{t('calculator.recommendations')}</h3>
        <p className="text-gray-600">
          {t('calculator.recommendationSubtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4 flex overflow-x-auto">
          {sortedCategories.map(cat => {
            const categoryKey = getCategoryTranslationKey(cat.category);
            return (
              <TabsTrigger 
                key={cat.category} 
                value={cat.category}
                className="flex-1 min-w-fit"
              >
                <span className="mr-2">{categoryKey ? t(categoryKey) : cat.category}</span>
                <Badge variant="outline" className="bg-circa-green-light text-circa-green">
                  {cat.total.toFixed(1)} kg
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedCategories.map(cat => (
          <TabsContent key={cat.category} value={cat.category} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {getRelevantTips(cat.category).map((tip, idx) => {
                const tipTitleKey = getTipTranslationKey(cat.category, tip.title);
                const tipDescKey = getTipDescriptionKey(cat.category, tip.title);
                
                return (
                  <Card key={idx} className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-bold">
                          {t(tipTitleKey, { defaultValue: tip.title })}
                        </CardTitle>
                        <div className="flex items-center">
                          {tip.impact === 'high' && (
                            <Zap className="h-5 w-5 text-green-600 mr-1" />
                          )}
                        </div>
                      </div>
                      <CardDescription className="text-gray-600">
                        {t(tipDescKey, { defaultValue: tip.description })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap mt-1">
                        <Badge variant="outline" className={`${impactColors[tip.impact]} border`}>
                          <Zap className="mr-1 h-3 w-3" />
                          {t(`impact.${tip.impact}`, { defaultValue: tip.impact.charAt(0).toUpperCase() + tip.impact.slice(1) })} {t('calculator.impact')}
                        </Badge>
                        <Badge variant="outline" className={`${difficultyColors[tip.difficulty]} border`}>
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {t(`difficulty.${tip.difficulty}`, { defaultValue: tip.difficulty.charAt(0).toUpperCase() + tip.difficulty.slice(1) })} {t('calculator.effort')}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          <ArrowRightCircle className="mr-1 h-3 w-3" />
                          {t('calculator.savings')}: {tip.savingPotential}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 