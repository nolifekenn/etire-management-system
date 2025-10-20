
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle, MessageSquare, Phone } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader title="Support Center" description="Get help and find answers to your questions." />

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Fill out the form below to send us a message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="supportName">Your Name</Label>
              <Input id="supportName" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Your Email</Label>
              <Input id="supportEmail" type="email" placeholder="john.doe@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportSubject">Subject</Label>
              <Input id="supportSubject" placeholder="e.g., Issue with inventory tracking" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportMessage">Message</Label>
              <Textarea id="supportMessage" placeholder="Describe your issue or question in detail..." rows={5} />
            </div>
            <Button className="w-full">Send Message</Button>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find quick answers to common questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h4 className="font-medium">How do I add a new user?</h4>
                  <p className="text-sm text-muted-foreground">Navigate to the Admin page and click the "Add User" button. This is only available for Administrators.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h4 className="font-medium">Can I export my sales data?</h4>
                  <p className="text-sm text-muted-foreground">Yes, on the Reports page, you can download a CSV of daily sales, low stock items, and service jobs.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h4 className="font-medium">How do I update my password?</h4>
                  <p className="text-sm text-muted-foreground">Navigate to the Settings page from the user menu in the bottom-left corner to update your account details.</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" disabled>View All FAQs</Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Other Ways to Reach Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Call Us</h4>
                  <p className="text-sm text-muted-foreground">+1 (800) 555-TIRE</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Live Chat</h4>
                  <p className="text-sm text-muted-foreground">Available Mon-Fri, 9am-5pm (Coming Soon)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
