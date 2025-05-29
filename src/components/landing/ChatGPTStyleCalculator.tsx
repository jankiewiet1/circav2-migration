import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Loader2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  ChevronDown,
  Plus,
  MessageSquare,
  Menu
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/branding/Logo';

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

const EXAMPLE_PROMPTS = [
  "100L diesel for vehicles",
  "500 kWh electricity",
  "1000 m³ natural gas"
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    type: 'bot',
    content: 'Hi! I can calculate CO₂ emissions for any activity. Just describe what you want to measure.',
    timestamp: new Date()
  }
];

export default function ChatGPTStyleCalculator() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize and update messages when language changes
  useEffect(() => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: t('chatbot.welcome', 'Hi! I can calculate CO₂ emissions for any activity and answer questions about carbon accounting. Just describe what you want to measure or ask me anything about sustainability.'),
        timestamp: new Date()
      }
    ]);
  }, [t]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    // Only scroll to bottom within the chat container, not the page
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!input.trim()) {
      toast.error(t('chatbot.enterRequest', 'Please enter an emission calculation request'));
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

    try {
      // First, try to determine if this is an emission calculation request or a general question
      const isCalculationRequest = await determineRequestType(userInput);
      
      if (isCalculationRequest) {
        // Handle emission calculation
        await handleEmissionCalculation(userInput);
      } else {
        // Handle general AI assistant question
        await handleGeneralQuestion(userInput);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      addMessage({
        type: 'bot',
        content: t('chatbot.error', 'Something went wrong. Please try again.')
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const determineRequestType = async (input: string): Promise<boolean> => {
    // Simple heuristics to determine if it's a calculation request
    const calculationKeywords = [
      'calculate', 'emission', 'co2', 'carbon', 'footprint', 'kg', 'ton', 'tonne',
      'liter', 'litre', 'kwh', 'kw', 'watt', 'diesel', 'petrol', 'gas', 'electricity',
      'flight', 'transport', 'vehicle', 'fuel', 'm3', 'cubic', 'gallon'
    ];
    
    const lowerInput = input.toLowerCase();
    
    // Check for numbers (quantities)
    const hasNumbers = /\d/.test(input);
    
    // Check for calculation keywords
    const hasCalculationKeywords = calculationKeywords.some(keyword => 
      lowerInput.includes(keyword)
    );
    
    // If it has numbers AND calculation keywords, it's likely a calculation
    // If it has strong calculation indicators, treat as calculation
    return hasNumbers && hasCalculationKeywords;
  };

  const handleEmissionCalculation = async (userInput: string) => {
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
          content: `**${data.total_emissions.toFixed(2)} ${data.emissions_unit}** ${t('chatbot.ofEmissions', 'of CO₂ emissions')}\n\n${t('chatbot.usingFactor', 'Using')} ${data.source} ${t('chatbot.emissionFactor', 'emission factor')}: ${data.emission_factor} ${data.emission_factor_unit}\n${t('chatbot.confidence', 'Confidence')}: ${(data.similarity_score * 100).toFixed(1)}%`,
          result: data
        });
        
        toast.success(t('chatbot.calculationComplete', 'Calculation completed!'));
      } else {
        addMessage({
          type: 'bot',
          content: t('chatbot.noMatch', `I couldn't find a good match for "${userInput}". Try being more specific about the activity, quantity, and unit.`)
        });
      }
    } catch (error) {
      console.error('Calculation error:', error);
      throw error;
    }
  };

  const handleGeneralQuestion = async (userInput: string) => {
    try {
      // Call OpenAI for general questions about carbon accounting, sustainability, etc.
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          context: 'carbon_accounting_assistant'
        }),
      });

      if (!response.ok) {
        // If chat assistant fails, provide a helpful fallback
        addMessage({
          type: 'bot',
          content: `I'm primarily designed to calculate CO₂ emissions. For general questions about carbon accounting and sustainability, I'd recommend:\n\n• Checking our help documentation\n• Contacting our support team at info@circa.site\n• Or try rephrasing your question as an emission calculation request\n\nFor example: "Calculate emissions for 100L diesel" or "500 kWh electricity consumption"`
        });
        return;
      }

      const data = await response.json();
      
      if (data.response) {
        addMessage({
          type: 'bot',
          content: data.response
        });
      } else {
        throw new Error('No response from assistant');
      }
    } catch (error) {
      console.error('General question error:', error);
      // Fallback response for general questions
      addMessage({
        type: 'bot',
        content: `I'm here to help with carbon emissions calculations and basic questions about sustainability. For detailed support, please contact our team at info@circa.site or visit our help center.\n\nTry asking me to calculate emissions like:\n• "100L diesel for vehicles"\n• "500 kWh electricity consumption"\n• "Flight from Amsterdam to London"`
      });
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleCalculate(e);
    }
  };

  const scrollToNextSection = () => {
    const nextSection = document.getElementById('learn-more');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const examplePrompts = [
    t('chatbot.example1', '100L diesel for vehicles'),
    t('chatbot.example2', '500 kWh electricity'),
    t('chatbot.example3', 'What is Scope 3 emissions?')
  ];

  return (
    <section className="h-screen bg-white flex relative">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-900 text-white flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-700">
          <button className="flex items-center w-full p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4 mr-3" />
            <span className="text-sm">{t('chatbot.newChat', 'New chat')}</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <button className="flex items-center w-full p-2 rounded-lg hover:bg-gray-800 transition-colors text-left">
              <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
              <span className="text-sm truncate">{t('chatbot.emissionsCalculator', 'Emissions Calculator')}</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            {t('chatbot.poweredBy', 'Powered by 45,000+ emission factors')}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg mr-3"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-medium">{t('chatbot.emissionsCalculator', 'Emissions Calculator')}</h1>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Welcome Message - Only show if no user messages */}
            {messages.filter(m => m.type === 'user').length === 0 && (
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-medium">C</span>
                </div>
                <h2 className="text-2xl font-medium mb-2">{t('chatbot.howCanIHelp', 'How can I help you today?')}</h2>
                <p className="text-gray-600 mb-6">{t('chatbot.calculateEmissions', 'Calculate CO₂ emissions or ask questions about carbon accounting')}</p>
                
                {/* Example Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="space-y-6 pb-24">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${
                    message.type === 'user' 
                      ? 'bg-black text-white rounded-2xl px-4 py-2' 
                      : 'space-y-2'
                  }`}>
                    {message.type === 'user' && (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {(message.type === 'bot' || message.type === 'result') && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">C</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
                            {message.content}
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
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">C</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="absolute bottom-16 left-0 right-0 p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleCalculate(e); }} className="flex items-center bg-white border border-gray-300 rounded-full px-4 py-3 shadow-sm">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.messagePlaceholder', 'Message Circa')}
                className="flex-1 border-0 focus:ring-0 text-sm bg-transparent placeholder-gray-500"
                disabled={isCalculating}
              />
              <Button
                type="submit"
                disabled={isCalculating || !input.trim()}
                size="sm"
                className="bg-black hover:bg-gray-800 text-white rounded-full w-8 h-8 p-0 ml-2"
              >
                {isCalculating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Scroll Down Arrow - Only show when no messages */}
      {messages.filter(m => m.type === 'user').length === 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={scrollToNextSection}
            className="bg-gray-100 text-gray-600 rounded-full p-3 shadow-sm hover:bg-gray-200 transition-colors animate-bounce"
            aria-label={t('chatbot.scrollDown', 'Scroll down to see more')}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}
    </section>
  );
} 