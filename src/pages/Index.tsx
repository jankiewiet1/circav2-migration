import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Upload, BarChart3, FileText, Target, ArrowUpRight, MessageCircle, Calendar, X, ChevronLeft, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Logo } from "@/components/branding/Logo";
import { HowItWorksFlow } from "@/components/landing/HowItWorksFlow";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { ClientLogos } from "@/components/landing/ClientLogos";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { SignupProgress } from "@/components/landing/SignupProgress";
import RAGChatCalculator from '@/components/landing/RAGChatCalculator';
import CO2Calculator from '@/components/landing/CO2Calculator';
import HeroChatCalculator from '@/components/landing/HeroChatCalculator';
import ChatGPTStyleCalculator from '@/components/landing/ChatGPTStyleCalculator';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { toast } = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [showCalendly, setShowCalendly] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  
  useEffect(() => {
    // Check if user was redirected from registration
    if (location.state?.registered) {
      toast({
        title: t('registration.successTitle', 'Registration Successful!'),
        description: t('registration.successDescription', 'Thank you for joining Circa! Please check your email to verify your account.'),
        duration: 6000,
      });
      
      // Clear state
      window.history.replaceState({}, document.title);
    }
    
    // Initialize Calendly widget
    const loadCalendly = () => {
      const head = document.querySelector('head');
      
      // Add Calendly CSS
      if (!document.querySelector('link[href="https://assets.calendly.com/assets/external/widget.css"]')) {
        const link = document.createElement('link');
        link.href = 'https://assets.calendly.com/assets/external/widget.css';
        link.rel = 'stylesheet';
        head?.appendChild(link);
      }
      
      // Add Calendly script
      if (!document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        head?.appendChild(script);
      }
    };
    
    loadCalendly();
  }, [location.state, toast, t]);

  // Initialize Calendly inline widget when needed
  useEffect(() => {
    if (chatOpen && showCalendly && window.Calendly) {
      const container = document.getElementById('calendly-inline-container');
      if (container) {
        // Using customized URL parameters to hide certain elements
        window.Calendly.initInlineWidget({
          url: 'https://calendly.com/circa-info/30min?hide_landing_page_details=1&hide_gdpr=1&background_color=ffffff&text_color=333333&primary_color=14532d',
          parentElement: container
        });
        
        // Add custom styles to better fit the Calendly widget in the chat box
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
          .calendly-inline-widget {
            min-height: 600px;
            height: 100%;
          }
          .calendly-inline-widget iframe {
            height: 100% !important;
          }
          /* Hide some Calendly elements we don't want to show */
          .calendly-spinner-container p,
          .calendly-spinner-container h2,
          .calendly-spinner-container h3 {
            display: none !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }, [chatOpen, showCalendly]);

  const handleBookingRequest = (wantsToBook: boolean) => {
    if (wantsToBook) {
      setShowCalendly(true);
      setShowButtons(false);
    } else {
      // Handle "No" response - could add more chat options here
      setShowButtons(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header/Nav - Always visible */}
      <header className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50 py-4 px-2 md:px-6">
        <div className="max-w-[1400px] w-full mx-auto flex justify-between items-center px-4">
          <div className="flex items-center">
            <Logo className="h-10 w-auto" />
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-base">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.howItWorks')}</a>
            <a href="#calculator-demo" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.calculator', 'AI Calculator')}</a>
            <a href="#showcase" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.showcase', 'Circa in Action')}</a>
            <a href="#why-circa" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.whyCirca')}</a>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <Button className="border-2 border-circa-green-dark text-gray-700 bg-white hover:bg-gray-100" asChild>
              <Link to="/auth/login">{t('common.login')}</Link>
            </Button>
            <Button className="bg-circa-green hover:bg-circa-green-dark text-black px-5 border-2 border-circa-green-dark" asChild>
              <Link to="/auth/register">{t('common.signup')}</Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* ChatGPT-Style Calculator - First section below header */}
      <ChatGPTStyleCalculator />

      {/* Original Hero Section */}
      <section id="learn-more" className="min-h-screen flex items-center pt-20 pb-16 md:pt-0 md:pb-0 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-[1400px] w-full mx-auto grid lg:grid-cols-2 gap-8 md:gap-16 items-center px-4">
          <div className="text-left">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">{t('badges.cdpReady')}</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">{t('badges.ghgProtocol')}</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">{t('badges.iso14064')}</span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">{t('badges.auditFriendly')}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="bg-green-100 px-2 rounded-md">{t('hero.title.highlight')}</span> {t('hero.title.your')} <br />
              {t('hero.title.carbon')}
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button className="bg-circa-green hover:bg-circa-green-dark text-black h-12 px-6 text-base font-medium border-2 border-circa-green-dark" asChild>
                <Link to="/auth/register">
                  {t('hero.cta.primary')}
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button className="bg-white border-2 border-circa-green-dark text-circa-green hover:bg-circa-green-light h-12 px-6 text-base font-medium" asChild>
                <a href="#ai-calculator">
                  {t('hero.cta.secondary')}
                </a>
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">{t('hero.noCreditCard')}</p>
            
            <div className="flex items-center space-x-6 mt-8">
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" alt={t('alt.userPhoto', 'User')} className="w-8 h-8 rounded-full border-2 border-white" />
                  <img src="https://randomuser.me/api/portraits/men/46.jpg" alt={t('alt.userPhoto', 'User')} className="w-8 h-8 rounded-full border-2 border-white" />
                  <img src="https://randomuser.me/api/portraits/women/22.jpg" alt={t('alt.userPhoto', 'User')} className="w-8 h-8 rounded-full border-2 border-white" />
                </div>
                <span className="ml-2 text-sm text-gray-600">{t('hero.trustedBy', 'Trusted by 500+ companies')}</span>
              </div>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-yellow-500">★★★★★</span>
                  <span className="ml-1 text-sm font-medium">4.8</span>
                </div>
                <span className="text-xs text-gray-600">{t('hero.ratingSource', 'Capterra')}</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full bg-green-50"></div>
            <div className="relative bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="w-full bg-gray-100 h-6 flex items-center px-2 space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <img 
                src="/dashboard.jpg" 
                alt={t('alt.dashboardImage', 'Circa Dashboard')}
                className="w-full object-cover"
                style={{ height: '380px' }}
              />
            </div>
            
            {/* Framework badges floating around dashboard */}
            <div className="absolute -top-10 right-10 bg-white rounded-full p-2 shadow-lg">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="font-bold text-green-700">{t('badges.ghgShort', 'GHG')}</span>
              </div>
            </div>
            
            <div className="absolute -bottom-8 left-10 bg-white rounded-full p-2 shadow-lg">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="font-bold text-blue-700">{t('badges.cdpShort', 'CDP')}</span>
              </div>
                </div>
            
            <div className="absolute top-1/3 -right-6 bg-white rounded-full p-2 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="font-bold text-xs text-purple-700">{t('badges.isoShort', 'ISO')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-circa-green-dark">
              {t('howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('howItWorks.subtitle')}
            </p>
          </div>
          <HowItWorksFlow />
          <div className="mt-14 text-center">
            <Button className="bg-circa-green hover:bg-circa-green-dark text-black h-11 px-8 text-lg" asChild>
              <Link to="/auth/register">
                {t('howItWorks.cta')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition Stats */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <ValueProposition />
        </div>
      </section>

      {/* Calculator Demo Section */}
      <section id="calculator-demo" className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Detailed Step-by-Step Calculator
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Perfect for comprehensive analysis and detailed breakdowns
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
          <CO2Calculator />
          </div>
        </div>
      </section>
      
      {/* Product Showcase */}
      <section id="showcase" className="py-20 md:py-28 px-4 bg-gray-50">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-circa-green-dark">
              {t('showcase.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('showcase.subtitle')}
            </p>
          </div>
          
          <ProductShowcase />
          
          <div className="mt-14 text-center">
            <Button className="bg-circa-green hover:bg-circa-green-dark text-black h-11 px-8 text-lg" asChild>
              <Link to="/auth/register">
                {t('showcase.cta')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Why Circa Section */}
      <section id="why-circa" className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-circa-green-dark">
              {t('whyCirca.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('whyCirca.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-circa-green-light flex items-center justify-center mb-6">
                <Check className="h-7 w-7 text-circa-green" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('whyCirca.benefit1Title')}</h3>
              <p className="text-gray-600">
                {t('whyCirca.benefit1Description')}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-circa-green-light flex items-center justify-center mb-6">
                <svg className="h-7 w-7 text-circa-green" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8V16M12 11V16M8 14V16M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('whyCirca.benefit2Title')}</h3>
              <p className="text-gray-600">
                {t('whyCirca.benefit2Description')}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 rounded-full bg-circa-green-light flex items-center justify-center mb-6">
                <svg className="h-7 w-7 text-circa-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{t('whyCirca.benefit3Title')}</h3>
              <p className="text-gray-600">
                {t('whyCirca.benefit3Description')}
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA */}
      <section className="py-16 bg-circa-green text-white">
        <div className="max-w-[1400px] w-full mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('finalCta.title')}</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">{t('finalCta.subtitle')}</p>
          <Button className="bg-white text-circa-green hover:bg-circa-green-light h-12 px-8 text-lg font-medium border-2 border-circa-green-dark" asChild>
            <Link to="/auth/register">
              {t('finalCta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="flex flex-col items-center justify-center">
            <Logo className="h-8 w-auto mb-4" />
            <p className="text-gray-600 text-center mb-4">{t('footer.tagline')}</p>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
      
      {/* Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => {
            setChatOpen(true);
            setShowCalendly(false);
            setShowButtons(true);
          }}
          className="bg-circa-green text-black rounded-full p-4 shadow-lg hover:bg-circa-green-dark transition-colors border-2 border-circa-green-dark" 
          aria-label={t('common.chat', 'Chat with us')}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

      {/* Chat Interface with Calendly */}
      {chatOpen && (
        <div className="fixed bottom-[5%] right-6 z-50 w-[420px] max-w-[95vw] shadow-2xl rounded-xl overflow-hidden">
          {/* Chat Header */}
          <div className="bg-circa-green text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Circa Support</h3>
            </div>
            <button 
              onClick={() => setChatOpen(false)} 
              className="text-white hover:text-gray-200"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="bg-white h-[650px] max-h-[80vh] flex flex-col">
            {/* Chat Messages */}
            {(!showCalendly || !window.Calendly) && (
              <div className="p-5 bg-gray-50 overflow-y-auto flex-1">
                <div className="flex items-start mb-4">
                  <div className="bg-white rounded-sm h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                    <img src="/icons/circa-icon.png" alt="Circa" className="h-10 w-10" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-3 max-w-[80%] shadow-sm">
                    <p className="text-sm text-gray-800">
                      {t('chat.welcome', 'Welkom bij Circa! Hoe kunnen we u helpen?')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start mb-4">
                  <div className="bg-white rounded-sm h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                    <img src="/icons/circa-icon.png" alt="Circa" className="h-10 w-10" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-3 max-w-[80%] shadow-sm">
                    <p className="text-sm text-gray-800">
                      {t('chat.bookQuestion', 'Wilt u een demo of adviesgesprek inplannen met ons team?')}
                    </p>
                  </div>
                </div>
                
                {showButtons && (
                  <div className="flex justify-center space-x-4 my-4">
                    <button 
                      onClick={() => handleBookingRequest(true)}
                      className="bg-circa-green text-white px-6 py-2 rounded-full shadow hover:bg-circa-green-dark transition-colors flex items-center border-2 border-circa-green-dark"
                    >
                      <span className="mr-1">{t('common.yes', 'Ja, graag')}</span> 👍
                    </button>
                    <button 
                      onClick={() => handleBookingRequest(false)}
                      className="bg-white border-2 border-circa-green-dark text-gray-800 px-6 py-2 rounded-full shadow hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <span className="mr-1">{t('common.no', 'Nee, bedankt')}</span> 🙂
                    </button>
                  </div>
                )}
                
                {!showButtons && !showCalendly && (
                  <div className="flex items-start mb-4">
                    <div className="bg-white rounded-sm h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                      <img src="/icons/circa-icon.png" alt="Circa" className="h-10 w-10" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-lg p-3 max-w-[80%] shadow-sm">
                      <p className="text-sm text-gray-800">
                        {t('chat.noBooking', 'Geen probleem! Als u vragen heeft over onze diensten, kunt u ons bereiken via info@circa.site.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Calendly Widget */}
            {showCalendly && (
              <div className="flex flex-col h-full">
                {/* Back Button for Calendly */}
                <div className="bg-white p-3 border-b flex items-center">
                  <button 
                    onClick={() => {
                      setShowCalendly(false);
                      setShowButtons(true);
                    }}
                    className="flex items-center text-gray-600 hover:text-circa-green"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span>{t('common.back', 'Terug')}</span>
                  </button>
                </div>
                
                <div id="calendly-inline-container" className="flex-1 overflow-hidden">
                  {/* Calendly will be initialized here */}
                </div>
              </div>
            )}
            
            {/* Final section with contact info */}
            {!showCalendly && !showButtons && (
              <div className="flex-1 flex items-center justify-center p-6 bg-white">
                <div className="text-center text-gray-500">
                  <div className="rounded-sm h-16 w-16 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                    <img src="/icons/circa-icon.png" alt="Circa" className="h-16 w-16" />
                  </div>
                  <p className="text-gray-700 font-medium">{t('chat.assistMessage', 'Ons team staat klaar om u te helpen.')}</p>
                  <p className="text-sm text-gray-500 mt-2">{t('chat.contactInfo', 'Email: info@circa.site')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
