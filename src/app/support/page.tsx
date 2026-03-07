"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle, MessageSquare, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SupportPage() {
  const [mounted, setMounted] = useState(false);
  // State for the workable FAQ accordion
  const [openFaqIndex, setOpenFaqIndex] = useState(0); 

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  // E-Tire Specific FAQ Data
  const faqItems = [
    {
      question: "How do I manage multi-branch inventory?",
      answer: "In the Inventory module, select the 'Branches' tab. You can view stock levels for specific locations or transfer items between branches using the 'Stock Transfer' action."
    },
    {
      question: "Processing sales and service jobs in POS?",
      answer: "The POS module allows you to add both physical tires and service labor (alignment, balancing) to a single cart. Select 'Service Job' from the item type dropdown during checkout."
    },
    {
      question: "How do I generate a Purchase Order (PO)?",
      answer: "Navigate to the Purchasing module. Click 'New PO', select your supplier, and add items. Once approved, the stock will automatically reflect in your 'Incoming Inventory'."
    },
    {
      question: "Where can I find daily sales reports?",
      answer: "Go to the Reports dashboard. You can filter by 'Daily Sales', 'Service Revenue', or 'Item Performance' to see a breakdown of tire sales versus service income."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins">
      <div className="container mx-auto p-6 sm:p-8 lg:p-10">
        
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2 font-poppins tracking-tight">
                Support Center
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 text-lg font-medium">
                  <HelpCircle className="h-5 w-5 opacity-90" />
                  Get Help and Find Answer to Your Questions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        {/* items-start ensures columns don't stretch to match height, preventing whitespace */}
        <div className={`grid md:grid-cols-2 gap-8 items-start transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Left Column: Contact Form */}
          <Card className="shadow-lg border-slate-200 hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-600" />
                Contact Support
              </CardTitle>
              <CardDescription>Fill out the form below to send us a message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="supportName" className="text-slate-700 font-medium">Your Name</Label>
                <Input 
                  id="supportName" 
                  placeholder="John Doe" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail" className="text-slate-700 font-medium">Your Email</Label>
                <Input 
                  id="supportEmail" 
                  type="email" 
                  placeholder="john.doe@example.com" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportSubject" className="text-slate-700 font-medium">Subject</Label>
                <Input 
                  id="supportSubject" 
                  placeholder="e.g., Issue with PO creation" 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportMessage" className="text-slate-700 font-medium">Message</Label>
                <Textarea 
                  id="supportMessage" 
                  placeholder="Describe your issue or question in detail..." 
                  rows={5} 
                  className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                />
              </div>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium transition-all duration-300 border-0 shadow-lg hover:opacity-90">
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Right Column: FAQs & Contact Info */}
          <div className="space-y-6">
            
            {/* FAQ Card - Now Workable/Collapsible */}
            <Card className="shadow-lg border-slate-200 hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-indigo-600" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Quick answers about the E-Tire System.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {faqItems.map((item, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg transition-all duration-200 ${openFaqIndex === index ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-3 text-left focus:outline-none"
                    >
                      <span className={`font-medium text-sm ${openFaqIndex === index ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {item.question}
                      </span>
                      {openFaqIndex === index ? (
                        <ChevronUp className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    
                    {/* Collapsible Content */}
                    <div 
                      className={`grid transition-all duration-300 ease-in-out ${
                        openFaqIndex === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-3 pb-3 text-sm text-slate-600 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Contact Info Card */}
            <Card className="shadow-lg border-slate-200 hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-indigo-600" />
                  Other Ways to Reach Us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-slate-100 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors">
                  <Phone className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm">Call Support</h4>
                    <p className="text-xs text-slate-500">+1 (800) 555-TIRE</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-slate-100 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm">Live Chat</h4>
                    <p className="text-xs text-slate-500">Mon-Fri, 9am-5pm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </div>
  );
}