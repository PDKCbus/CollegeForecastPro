import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, MessageSquare, Send } from "lucide-react";

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/contact', data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Thanks for reaching out! We'll get back to you soon.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
            <p className="text-white/70 text-lg">
              Have questions about Rick's Picks or need help with our college football analytics?
              We'd love to hear from you.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 mb-8">
            <Card className="bg-surface border-surface-light">
              <CardContent className="pt-6 text-center">
                <Mail className="h-8 w-8 text-accent mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">Email</h3>
                <p className="text-white/70 text-sm">rickspickscfb@gmail.com</p>
              </CardContent>
            </Card>

            <Card className="bg-surface border-surface-light">
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 text-accent mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">Support</h3>
                <p className="text-white/70 text-sm">General questions and technical support</p>
              </CardContent>
            </Card>

            <Card className="bg-surface border-surface-light">
              <CardContent className="pt-6 text-center">
                <Send className="h-8 w-8 text-accent mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">Response Time</h3>
                <p className="text-white/70 text-sm">Usually within 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-surface border-surface-light">
            <CardHeader>
              <CardTitle className="text-white">Send us a Message</CardTitle>
              <CardDescription className="text-white/70">
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                      Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="bg-background border-surface-light text-white"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Email *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="bg-background border-surface-light text-white"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-white mb-2">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className="bg-background border-surface-light text-white"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className="bg-background border-surface-light text-white min-h-[120px]"
                    placeholder="Tell us how we can help..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={contactMutation.isPending}
                >
                  {contactMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-8 p-4 bg-surface/50 rounded-lg border border-surface-light">
            <p className="text-white/60 text-sm">
              For betting questions, please review our comprehensive{" "}
              <a href="/faq" className="text-accent hover:underline">FAQ section</a>{" "}
              which covers algorithm performance, disclaimers, and responsible gambling information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}