import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Loader2,
  MessageCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface CalculationResult {
  success: boolean;
  total_emissions: number;
  emissions_unit: string;
  emission_factor: number;
  emission_factor_unit: string;
  confidence_score: number;
  similarity_score: number;
  source: string;
  matched_activity: string;
  processing_time_ms: number;
  quantity: number;
  unit: string;
}

const QUICK_EXAMPLES = [
  "100L diesel for vehicles",
  "500 kWh electricity",
  "1000 m³ natural gas",
  "Flight Amsterdam-London"
];

export default function RAGChatCalculator() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCalculate = async () => {
    if (!input.trim()) {
      toast.error('Please enter an emission calculation request');
      return;
    }

    setIsCalculating(true);
    setResult(null);
    setShowResult(false);

    try {
      // Call the RAG emissions calculator Edge Function directly (without company_id for demo)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: input,
          demo_mode: true // Special flag for demo calculations
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setShowResult(true);
        toast.success('🎉 Calculation completed!');
      } else {
        throw new Error(data.error || 'Calculation failed');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate emissions. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCalculate();
    }
  };

  return (
    <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Bot className="w-5 h-5 mr-2 text-blue-600" />
            AI Quick Calculator
            <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Try it!
            </Badge>
          </CardTitle>
          <div className="flex items-center text-xs text-gray-600">
            <Zap className="w-3 h-3 mr-1" />
            45,000+ factors
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Examples */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_EXAMPLES.map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Input and Button */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 100 liters diesel for company vehicles"
            className="flex-1 text-sm"
            disabled={isCalculating}
          />
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || !input.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            {isCalculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Result */}
        {showResult && result && (
          <div className="bg-white border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-green-700">
                  {result.total_emissions.toFixed(2)} {result.emissions_unit}
                </div>
                <p className="text-xs text-gray-600">Total Emissions</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                  {(result.similarity_score * 100).toFixed(1)}% match
                </Badge>
                <p className="text-xs text-gray-500 mt-1">{result.processing_time_ms}ms</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Factor:</span>
                <div className="font-medium">{result.emission_factor} {result.emission_factor_unit}</div>
              </div>
              <div>
                <span className="text-gray-600">Source:</span>
                <div className="font-medium">{result.source}</div>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600">
                <strong>Matched:</strong> {result.matched_activity}
              </p>
            </div>
          </div>
        )}

        {isCalculating && (
          <div className="bg-white border border-blue-200 rounded-lg p-4 text-center">
            <Loader2 className="w-6 h-6 mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-600">AI is analyzing your request...</p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-600">
            Want more features? 
            <a href="/auth/register" className="text-blue-600 hover:text-blue-700 ml-1 font-medium">
              Sign up for batch processing, reporting & more →
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 