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
    const categoryKey = category === 'Elektriciteit' ? 'electricity' :
                        category === 'Verwarming' ? 'heating' :
                        category === 'Zakelijk vervoer' ? 'businessTransport' :
                        category === 'Vliegreizen' ? 'flights' : '';
    const sanitizedTitle = title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '');
    return `tips.${categoryKey}.${sanitizedTitle}`;
  };

  // Get the translation key for a tip description
  const getTipDescriptionKey = (category: string, title: string) => {
    return `${getTipTranslationKey(category, title)}.description`;
  };

  const renderTipCard = (tip: any, categoryName: string, key: string | number) => (
    <Card key={key} className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-bold">
            {t(getTipTranslationKey(categoryName, tip.title), { defaultValue: tip.title })}
          </CardTitle>
          {tip.impact === 'high' && (
            <Zap className="h-5 w-5 text-green-600 mr-1 flex-shrink-0" />
          )}
        </div>
        <CardDescription className="text-gray-600 text-sm mt-1 line-clamp-4">
          {t(getTipDescriptionKey(categoryName, tip.title), { defaultValue: tip.description })}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className={`${impactColors[tip.impact]} border text-xs py-0.5`}>
            <Zap className="mr-1 h-3 w-3" />
            {t(`impact.${tip.impact}`)}
          </Badge>
          <Badge variant="outline" className={`${difficultyColors[tip.difficulty]} border text-xs py-0.5`}>
            <AlertCircle className="mr-1 h-3 w-3" />
            {t(`effort.${tip.difficulty}`)}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-xs py-0.5">
            <ArrowRightCircle className="mr-1 h-3 w-3" />
            {t('savings', { value: tip.savingPotential })}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  // Default view with Tabs (this is now the only view)
  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">{t('calculator.recommendations')}</h3>
        <p className="text-gray-600">
          {t('calculator.recommendationSubtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-4 flex overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {sortedCategories.map(cat => {
            const categoryKey = getCategoryTranslationKey(cat.category);
            return (
              <TabsTrigger 
                key={cat.category} 
                value={cat.category}
                className="flex-1 min-w-fit px-3 py-2"
              >
                <span className="mr-2 text-sm">{categoryKey ? t(categoryKey) : cat.category}</span>
                <Badge variant="outline" className="bg-circa-green-light text-circa-green text-xs">
                  {cat.total.toFixed(1)} kg
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sortedCategories.map(cat => (
          <TabsContent key={cat.category} value={cat.category} className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 auto-rows-fr">
              {getRelevantTips(cat.category).map((tip, idx) => renderTipCard(tip, cat.category, idx))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 