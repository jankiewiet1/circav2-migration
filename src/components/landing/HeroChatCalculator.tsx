import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Bot, 
  Sparkles, 
  Send, 
  Loader2,
  MessageCircle,
  Zap,
  ArrowRight,
  CheckCircle
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

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'result';
  content: string;
  result?: CalculationResult;
  timestamp: Date;
}

const QUICK_EXAMPLES = [
  "100L diesel for vehicles",
  "500 kWh electricity", 
  "1000 m³ natural gas",
  "50L petrol EURO 95"
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    type: 'bot',
    content: '👋 Hi! I\'m your AI emissions calculator. Just describe any activity and I\'ll instantly calculate the CO₂ emissions using our database of 45,000+ factors.',
    timestamp: new Date()
  },
  {
    id: '2', 
    type: 'bot',
    content: 'Try something like "100 liters diesel for company vehicles" or click one of the examples below:',
    timestamp: new Date()
  }
];

export default function HeroChatCalculator() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isExpanded, setIsExpanded] = useState(false);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleCalculate = async () => {
    if (!input.trim()) {
      toast.error('Please enter an emission calculation request');
      return;
    }

    // Add user message
    addMessage({
      type: 'user',
      content: input
    });

    const userInput = input;
    setInput('');
    setIsCalculating(true);
    setIsExpanded(true);

    try {
      // Call the RAG emissions calculator Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: userInput,
          demo_mode: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Add result message
        addMessage({
          type: 'result',
          content: `✅ Found a perfect match! Your activity produces **${data.total_emissions.toFixed(2)} ${data.emissions_unit}** of emissions.`,
          result: data
        });
        
        toast.success('🎉 Calculation completed!');
      } else {
        addMessage({
          type: 'bot',
          content: `❌ Sorry, I couldn't find a good match for "${userInput}". Try being more specific about the activity, quantity, and unit.`
        });
      }
    } catch (error) {
      console.error('Calculation error:', error);
      addMessage({
        type: 'bot',
        content: '❌ Oops! Something went wrong. Please try again or contact support if the issue persists.'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setIsExpanded(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCalculate();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Compact Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-green-50 shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full mr-3">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">AI Emissions Calculator</h3>
                <p className="text-sm text-gray-600">Instant CO₂ calculations powered by 45,000+ factors</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Try it now!
            </Badge>
          </div>

          {/* Chat Messages - Only show if expanded or has results */}
          {(isExpanded || messages.length > 2) && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white rounded-lg px-3 py-2' 
                        : message.type === 'result'
                        ? 'bg-green-50 border border-green-200 rounded-lg p-3'
                        : 'bg-gray-100 rounded-lg px-3 py-2'
                    }`}>
                      {message.type === 'bot' && (
                        <div className="flex items-start">
                          <Bot className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{message.content}</p>
                        </div>
                      )}
                      
                      {message.type === 'user' && (
                        <p className="text-sm">{message.content}</p>
                      )}
                      
                      {message.type === 'result' && message.result && (
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700">{message.content}</p>
                          </div>
                          
                          {/* Result Details */}
                          <div className="bg-white border border-green-300 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-600">Emission Factor:</span>
                                <div className="font-medium">{message.result.emission_factor} {message.result.emission_factor_unit}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Confidence:</span>
                                <div className="font-medium">{(message.result.similarity_score * 100).toFixed(1)}%</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Source:</span>
                                <div className="font-medium">{message.result.source}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Processing:</span>
                                <div className="font-medium">{message.result.processing_time_ms}ms</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Loading message */}
                {isCalculating && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center">
                        <Bot className="w-4 h-4 text-blue-600 mr-2" />
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <p className="text-sm text-gray-700">Analyzing your request...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Examples - Only show if not expanded */}
          {!isExpanded && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Quick examples:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_EXAMPLES.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 100 liters diesel for company vehicles"
              className="flex-1"
              disabled={isCalculating}
              onFocus={() => setIsExpanded(true)}
            />
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4"
            >
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* CTA */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Want batch processing, detailed reports & more? 
              <a href="/auth/register" className="text-blue-600 hover:text-blue-700 ml-1 font-medium">
                Start your free trial →
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 