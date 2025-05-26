import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Bot, Lightbulb } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type MessageType = {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  suggestion_logged?: boolean;
};

export const EnhancedChatBot = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "1",
      content: "👋 Hi there! I'm your Carbon Data Agent assistant. I can help you with platform navigation, sustainability consulting, technical support, and I'll log any feature suggestions you have. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [suggestionCount, setSuggestionCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate session ID on component mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSend = async () => {
    if (inputValue.trim() === "" || isTyping) return;

    const userMessage: MessageType = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Prepare messages for the API
      const apiMessages = messages.concat(userMessage).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          messages: apiMessages,
          session_id: sessionId,
          user_id: user?.id || null
        }
      });

      if (error) throw error;

      const botResponse: MessageType = {
        id: (Date.now() + 1).toString(),
        content: data.choices[0].message.content,
        sender: "bot",
        timestamp: new Date(),
        suggestion_logged: data.suggestion_logged
      };

      setMessages(prev => [...prev, botResponse]);

      // Show notification if suggestion was logged
      if (data.suggestion_logged) {
        setSuggestionCount(prev => prev + 1);
        toast.success("💡 Your suggestion has been logged for our team to review!", {
          duration: 4000
        });
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to get response. Please try again.", {
        duration: 3000
      });

      // Add a fallback message
      const fallbackMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble responding right now. Please email us at info@circa.site for assistance.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="shadow-md h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            Enhanced AI Assistant
          </div>
          {suggestionCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Lightbulb className="h-3 w-3 mr-1" />
              {suggestionCount} suggestion{suggestionCount > 1 ? 's' : ''} logged
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {suggestionCount > 0 && (
        <div className="px-4 pb-2">
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Thanks for your suggestions! Our team will review them and consider them for future updates.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] p-4 pt-0">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="flex items-start gap-2 max-w-[85%]">
                  {message.sender === "bot" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                      <Bot className="h-3 w-3 text-blue-600" />
                    </div>
                  )}
                  
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {message.suggestion_logged && (
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          <Lightbulb className="h-2 w-2 mr-1" />
                          Suggestion logged
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {message.sender === "user" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-1">
                      <User className="h-3 w-3 text-green-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-1">
                    <Bot className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "100ms" }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "200ms" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the platform, sustainability, or suggest new features..."
            disabled={isTyping}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isTyping || inputValue.trim() === ""}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center w-full">
          💡 Try asking: "How do I upload data?" or "I wish the platform had a carbon offset marketplace"
        </div>
      </CardFooter>
    </Card>
  );
}; 