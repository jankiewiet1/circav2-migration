import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, RefreshCw } from "lucide-react";
import { AIDataExtractionResponse } from '@/types/dataEntry';
import { openai, isConfigured } from '@/integrations/openai/client';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatAssistantProps {
  extractionResponse: AIDataExtractionResponse | null;
  onSuggestMapping: (originalField: string, correctedField: string) => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  extractionResponse, 
  onSuggestMapping 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: 'I\'m your AI assistant for carbon data mapping. I can help you map fields from your data source to the correct fields in our system.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When extractionResponse changes, add context about the current data
  useEffect(() => {
    if (extractionResponse) {
      const unmappedCount = extractionResponse.unmapped_fields.length;
      const ambiguousCount = extractionResponse.ambiguous_fields.length;
      
      if (unmappedCount > 0 || ambiguousCount > 0) {
        let newMessage = 'I\'ve analyzed your data and found some fields that need attention:\n\n';
        
        if (unmappedCount > 0) {
          newMessage += `- ${unmappedCount} unmapped fields: ${extractionResponse.unmapped_fields.join(', ')}\n`;
        }
        
        if (ambiguousCount > 0) {
          newMessage += `- ${ambiguousCount} ambiguous fields: ${extractionResponse.ambiguous_fields.map(f => f.original_header).join(', ')}\n`;
        }
        
        newMessage += '\nHow would you like me to help you map these fields?';
        
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: newMessage,
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [extractionResponse]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isProcessing) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      let assistantResponse = '';
      
      // If OpenAI is configured, use it for responses
      if (isConfigured) {
        // Prepare the context for OpenAI
        const contextMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Add extraction data as context
        let systemContext = 'You are an AI assistant helping with carbon data mapping. ';
        
        if (extractionResponse) {
          systemContext += `The user has uploaded data with these headers: ${
            extractionResponse.mappings.map(m => m.original_header).join(', ')
          }. `;
          
          if (extractionResponse.unmapped_fields.length > 0) {
            systemContext += `Unmapped fields: ${extractionResponse.unmapped_fields.join(', ')}. `;
          }
          
          if (extractionResponse.ambiguous_fields.length > 0) {
            systemContext += `Ambiguous fields: ${
              extractionResponse.ambiguous_fields.map(f => 
                `${f.original_header} (possible match: ${f.mapped_field}, confidence: ${f.confidence})`
              ).join(', ')
            }. `;
          }
        }
        
        systemContext += 'The data model has these fields: date, source_type, supplier_vendor, activity_description, quantity, unit, currency, cost, ghg_category, notes.';
        
        // Add user message
        contextMessages.push({
          role: 'user',
          content: inputMessage
        });
        
        // Call OpenAI API
        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemContext },
            ...contextMessages
          ],
          temperature: 0.7,
          max_tokens: 500
        });
        
        assistantResponse = response.choices[0]?.message?.content || 'I couldn\'t generate a response. Please try again.';
        
        // Check for field mapping suggestions in the response
        const fieldMappingRegex = /map\s+["']([^"']+)["']\s+to\s+["']([^"']+)["']/gi;
        let match;
        
        while ((match = fieldMappingRegex.exec(assistantResponse)) !== null) {
          const originalField = match[1];
          const targetField = match[2];
          
          // Verify the target field is valid
          const validFields = [
            'date', 'source_type', 'supplier_vendor', 'activity_description', 
            'quantity', 'unit', 'currency', 'cost', 'ghg_category', 'notes'
          ];
          
          if (validFields.includes(targetField)) {
            onSuggestMapping(originalField, targetField);
          }
        }
      } else {
        // Fallback responses if OpenAI is not configured
        const fallbackResponses = [
          'I suggest mapping date columns to the "date" field, numeric values to "quantity", and descriptions to "activity_description".',
          'You can map headers that contain "supplier" or "vendor" to the "supplier_vendor" field.',
          'Headers containing "unit" or "uom" should be mapped to the "unit" field.',
          'For GHG categories, look for headers containing "scope" or "category".',
          'I recommend reviewing ambiguous fields manually to ensure accurate data mapping.'
        ];
        
        assistantResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
      
      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error generating chat response:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-md flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
          AI Mapping Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-line">{message.content}</div>
                  {message.timestamp && (
                    <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="mt-auto">
          <div className="flex items-end gap-2">
            <Textarea 
              placeholder="Ask for help with mapping fields..." 
              className="min-h-[60px] flex-1"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              disabled={isProcessing}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!inputMessage.trim() || isProcessing}
              className="h-[60px] w-[60px]"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 