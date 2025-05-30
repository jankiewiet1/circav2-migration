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
  const [showConversionCard, setShowConversionCard] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize and update messages when language changes
  useEffect(() => {
    setMessages([]);
  }, [t]);

  // Load Calendly script
  useEffect(() => {
    const loadCalendly = () => {
      // Add Calendly CSS
      if (!document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]')) {
        const link = document.createElement('link');
        link.href = 'https://assets.calendly.com/assets/external/widget.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      
      // Add Calendly script
      if (!document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.head.appendChild(script);
      }
    };
    
    loadCalendly();
  }, []);

  // Initialize Calendly when modal opens
  useEffect(() => {
    if (showCalendlyModal && window.Calendly) {
      const container = document.getElementById('calendly-modal-container');
      if (container) {
        container.innerHTML = ''; // Clear any existing content
        window.Calendly.initInlineWidget({
          url: 'https://calendly.com/circa-info/30min?hide_landing_page_details=1&hide_gdpr=1&background_color=ffffff&text_color=333333&primary_color=14532d',
          parentElement: container
        });
      }
    }
  }, [showCalendlyModal]);

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

  // Show conversion card with delay after user gets a response
  useEffect(() => {
    const userMessages = messages.filter(m => m.type === 'user');
    const botResponses = messages.filter(m => m.type === 'bot' || m.type === 'result');
    
    // Show card 5 seconds after user gets their first response
    if (userMessages.length > 0 && botResponses.length > 1 && !isCalculating) {
      const timer = setTimeout(() => {
        setShowConversionCard(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, isCalculating]);

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
    t('chatbot.example1', 'Calculate CO₂ for 100L diesel fuel'),
    t('chatbot.example2', 'Emissions from 500 kWh electricity usage'),
    t('chatbot.example3', 'Carbon footprint of 1000km flight')
  ];

  return (
    <>
      <section className="min-h-screen bg-white flex flex-col relative overflow-hidden pt-20">
        {/* Chat Messages Container - Only visible when chatting */}
        {messages.filter(m => m.type === 'user').length > 0 && (
          <div className="flex-1 overflow-auto px-4 py-6 pt-24">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    message.type === 'user' 
                      ? 'bg-circa-green text-black rounded-2xl px-5 py-3 shadow-sm' 
                      : 'space-y-2'
                  }`}>
                    {message.type === 'user' && (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                    
                    {(message.type === 'bot' || message.type === 'result') && (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-circa-green to-circa-green-dark rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-black text-sm font-semibold">C</span>
                        </div>
                        <div className="flex-1 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
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
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-circa-green to-circa-green-dark rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-black text-sm font-semibold">C</span>
                    </div>
                    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-circa-green rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-circa-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-circa-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600 ml-2">{t('chatbot.calculating', 'Calculating...')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Welcome Screen - Only visible when no messages */}
        {messages.filter(m => m.type === 'user').length === 0 && (
          <div className="flex-1 flex items-center justify-center px-4 pt-24">
            <div className="w-full max-w-4xl text-center">
              {/* Massive Centered Logo */}
              <div className="flex items-center justify-center mb-8">
                <Logo className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40" withText={false} isLink={false} />
              </div>
              
              {/* Title and Tagline */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4">Circa</h1>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-600 font-medium mb-6">{t('chatbot.tagline', 'One click circularity')}</p>
              <p className="text-base md:text-lg text-gray-500 mb-16 max-w-2xl mx-auto">{t('chatbot.calculatorDescription', 'Ask me to calculate CO₂ emissions for any activity. I use verified emission factors from trusted databases.')}</p>
              
              {/* Example Cards - Smaller and More Centralized */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="group text-left p-3 border border-gray-200 rounded-lg hover:border-circa-green hover:shadow-md transition-all duration-200 text-xs bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 group-hover:text-gray-800">{example}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-circa-green transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Fixed at Bottom */}
        <div className="bg-white p-4 lg:p-6">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleCalculate(e); }} className="relative">
              <div className="flex items-center bg-white border-2 border-gray-300 rounded-2xl px-4 lg:px-6 py-3 lg:py-4 shadow-lg focus-within:border-circa-green transition-all duration-200">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chatbot.messagePlaceholder', 'Ask me to calculate emissions, e.g. "100L diesel" or "500 kWh electricity"')}
                  className="flex-1 border-0 focus:ring-0 text-base bg-transparent placeholder-gray-500 focus:outline-none"
                  disabled={isCalculating}
                />
                <Button
                  type="submit"
                  disabled={isCalculating || !input.trim()}
                  size="sm"
                  className="bg-circa-green hover:bg-circa-green-dark text-black rounded-xl px-4 py-2 ml-3 transition-colors"
                >
                  {isCalculating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
            
            {/* CTA Button Below Input */}
            <div className="flex justify-center mt-4">
              {messages.filter(m => m.type === 'user').length === 0 ? (
                <button
                  onClick={scrollToNextSection}
                  className="bg-circa-green-light text-circa-green rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-circa-green hover:scale-105"
                  aria-label={t('chatbot.scrollDown', 'Scroll down to see more')}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{t('chatbot.seeHowWorks', 'See how Circa works')}</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
              ) : (
                <div className={`transition-all duration-500 ${
                  showConversionCard ? 'animate-pulse' : 'animate-bounce'
                }`}>
                  <button
                    onClick={scrollToNextSection}
                    className="bg-circa-green-light text-circa-green rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 border border-circa-green hover:scale-105 text-xs"
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{t('chatbot.exploreMore', 'Explore more')}</span>
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversion Card Modal */}
        {messages.filter(m => m.type === 'user').length > 0 && (
          <div 
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-all duration-1000 ease-out ${
              showConversionCard 
                ? 'opacity-100 pointer-events-auto' 
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 p-8 relative border border-circa-green-light">
              {/* Close button */}
              <button
                onClick={() => setShowConversionCard(false)}
                className="absolute top-4 right-4 text-circa-green hover:text-circa-green-dark transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-circa-green-light"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-circa-green mr-3" />
                  <span className="text-2xl font-semibold text-gray-900">{t('chatbot.readyForMore', 'Ready for more?')}</span>
                </div>
                <p className="text-gray-600 mb-6 text-lg">
                  {t('chatbot.automateProcess', 'See how Circa can automate your entire carbon accounting process')}
                </p>
                <div className="space-y-4">
                  {/* Book a Demo - Primary button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCalendlyModal(true);
                    }}
                    className="w-full bg-circa-green hover:bg-circa-green-dark text-black rounded-xl px-6 py-4 text-lg font-medium transition-colors cursor-pointer hover:shadow-md active:scale-95"
                  >
                    {t('chatbot.bookDemo', 'Book a Demo')}
                  </button>
                  {/* Explore Circa - Secondary button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowConversionCard(false);
                      scrollToNextSection();
                    }}
                    className="w-full bg-circa-green-light hover:bg-circa-green text-circa-green-dark rounded-lg px-4 py-3 text-sm font-medium transition-colors cursor-pointer hover:shadow-sm active:scale-95 border border-circa-green"
                  >
                    {t('chatbot.explorePlatform', 'Explore Circa Platform')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Calendly Modal */}
      {showCalendlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#e8f6ee] bg-opacity-90">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden border border-[#b2f2d7] relative animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-circa-green-light to-circa-green text-circa-green-dark px-6 py-4 flex justify-between items-center rounded-t-3xl border-b border-circa-green-light">
              <div className="flex items-center gap-3">
                <Logo className="h-8 w-8" withText={false} isLink={false} />
                <h3 className="text-lg font-semibold tracking-tight">Book a Demo</h3>
              </div>
              <button 
                onClick={() => setShowCalendlyModal(false)}
                className="text-circa-green hover:text-circa-green-dark transition-colors rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-circa-green-light"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Calendly Content */}
            <div className="h-[650px] bg-circa-green-light">
              <div id="calendly-modal-container" className="h-full w-full" />
            </div>
          </div>
        </div>
      )}
    </>
  );
} 