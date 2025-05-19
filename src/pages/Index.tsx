import React from 'react';
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Upload, BarChart3, FileText, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Logo } from "@/components/branding/Logo";
import { HowItWorksFlow } from "@/components/landing/HowItWorksFlow";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { ClientLogos } from "@/components/landing/ClientLogos";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { SignupProgress } from "@/components/landing/SignupProgress";
import CO2Calculator from '@/components/landing/CO2Calculator';
import { LanguageSelector } from '@/components/ui/language-selector';

const Index = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Header/Nav */}
      <header className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50 py-6 px-2 md:px-6">
        <div className="max-w-[1920px] w-full mx-auto flex justify-between items-center px-4">
          <div className="flex items-center pl-8 md:pl-12">
            <Logo className="h-12 w-auto" />
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-base">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.howItWorks')}</a>
            <a href="#why-circa" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.whyCirca')}</a>
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.features')}</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.testimonials')}</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">{t('nav.pricing')}</a>
          </div>
          
          <div className="flex items-center space-x-4 pr-2 md:pr-6">
            <LanguageSelector />
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth/login">{t('common.login')}</Link>
            </Button>
            <Button className="bg-circa-green hover:bg-circa-green-dark" size="lg" asChild>
              <Link to="/auth/register">{t('common.signup')}</Link>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] w-full mx-auto grid lg:grid-cols-2 gap-12 items-center px-4">
          <div className="text-left max-w-xl mx-auto lg:max-w-none">
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">{t('badges.cdpReady')}</span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">{t('badges.ghgProtocol')}</span>
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">{t('badges.iso14064')}</span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">{t('badges.auditFriendly')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-responsive">
              <span className="text-[#004D2F]">{t('hero.title1')}<br />{t('hero.title2')}</span>—<br />
              <span className="text-blue-600">{t('hero.title3')}<br />{t('hero.title4')}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed text-responsive">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Button size="lg" className="bg-[#004D2F] hover:bg-[#003D2F] text-white text-lg px-6" asChild>
                <Link to="/auth/register">
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-[#004D2F] text-[#004D2F] hover:bg-[#004D2F]/10 text-lg">
                {t('hero.ctaSecondary')}
              </Button>
            </div>
            <p className="text-sm text-gray-500">{t('hero.noCreditCard')}</p>
          </div>
          
          <div className="relative">
            <div className="w-full rounded-xl shadow-2xl overflow-hidden bg-white" style={{ height: '440px' }}>
              <img 
                src="https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
                alt="Lush green rolling hills and forest"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center center' }}
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-responsive">{t('hero.reduceEmissions')}</span>
                </div>
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
              {t('nav.howItWorks')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('howItWorks.subtitle')}
            </p>
          </div>
          <HowItWorksFlow />
          <div className="mt-14 text-center">
            <Button className="bg-circa-green hover:bg-circa-green-dark" size="lg" asChild>
              <Link to="/auth/register">
                {t('howItWorks.cta')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CO2 Calculator Demo Section */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-circa-green-dark text-center">{t('calculator.title')}</h2>
          <p className="text-center text-gray-600 mb-8">{t('calculator.subtitle')}</p>
          <CO2Calculator />
        </div>
      </section>

      {/* Value Proposition Stats */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <ValueProposition />
        </div>
      </section>
      
      {/* Product Showcase */}
      <section className="py-20 md:py-28 px-4 bg-gray-50">
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
            <Button className="bg-circa-green hover:bg-circa-green-dark" size="lg" asChild>
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
              {t('nav.whyCirca')}
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
      
      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-[1400px] w-full mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-circa-green-dark">
              {t('nav.features')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="h-12 w-12 rounded-lg bg-circa-green-light flex items-center justify-center mb-5">
                <Upload className="h-6 w-6 text-circa-green" />
              </div>
              <h3 className="text-lg font-bold mb-3">{t('features.feature1Title')}</h3>
              <p className="text-gray-600">
                {t('features.feature1Description')}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="h-12 w-12 rounded-lg bg-circa-green-light flex items-center justify-center mb-5">
                <BarChart3 className="h-6 w-6 text-circa-green" />
              </div>
              <h3 className="text-lg font-bold mb-3">{t('features.feature2Title')}</h3>
              <p className="text-gray-600">
                {t('features.feature2Description')}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="h-12 w-12 rounded-lg bg-circa-green-light flex items-center justify-center mb-5">
                <FileText className="h-6 w-6 text-circa-green" />
              </div>
              <h3 className="text-lg font-bold mb-3">{t('features.feature3Title')}</h3>
              <p className="text-gray-600">
                {t('features.feature3Description')}
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:translate-y-[-5px]">
              <div className="h-12 w-12 rounded-lg bg-circa-green-light flex items-center justify-center mb-5">
                <Target className="h-6 w-6 text-circa-green" />
              </div>
              <h3 className="text-lg font-bold mb-3">{t('features.feature4Title')}</h3>
              <p className="text-gray-600">
                {t('features.feature4Description')}
              </p>
            </div>
          </div>
          
          <div className="mt-14 text-center">
            <Button className="bg-circa-green hover:bg-circa-green-dark" size="lg" asChild>
              <Link to="/auth/register">
                {t('features.cta')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 md:py-24 px-6 bg-circa-green-dark text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('cta.subtitle')}
          </p>
          <Button size="lg" variant="outline" className="bg-white text-circa-green-dark hover:bg-white/90 border-white text-lg px-8 py-6" asChild>
              <Link to="/auth/register">
              {t('common.signup')}
              <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 md:py-16 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <Logo className="h-10 w-auto mb-6" />
              <p className="mb-6">
                Making carbon accounting simple, accurate, and actionable for businesses of all sizes.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Partners</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} Circa. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
