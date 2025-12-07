import { useSiteSettings } from "@/lib/site-settings";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, Target, Users, Award, CheckCircle } from "lucide-react";

const teamMembers = [
  { name: "Alex Johnson", role: "CEO & Founder", initials: "AJ" },
  { name: "Sarah Chen", role: "CTO", initials: "SC" },
  { name: "Mike Williams", role: "Head of Operations", initials: "MW" },
  { name: "Emily Davis", role: "Customer Success Lead", initials: "ED" },
];

const values = [
  {
    icon: Target,
    title: "Excellence",
    description: "We strive for excellence in every service we provide, ensuring top-quality solutions.",
  },
  {
    icon: Users,
    title: "Customer Focus",
    description: "Our customers are at the heart of everything we do. Your success is our priority.",
  },
  {
    icon: Shield,
    title: "Integrity",
    description: "We operate with transparency and honesty, building trust with every interaction.",
  },
  {
    icon: Award,
    title: "Innovation",
    description: "We continuously evolve our services to meet the changing needs of the IT landscape.",
  },
];

const stats = [
  { value: "500+", label: "Services Completed" },
  { value: "99%", label: "Customer Satisfaction" },
  { value: "24/7", label: "Support Available" },
  { value: "10+", label: "Years Experience" },
];

export default function AboutPage() {
  const { settings } = useSiteSettings();
  
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">About Us</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            About {settings.siteName}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're dedicated to providing exceptional IT services that help businesses 
            and individuals thrive in the digital age.
          </p>
        </div>
        
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                At {settings.siteName}, we believe that technology should empower, not complicate. 
                Our mission is to make professional IT services accessible to everyone, 
                from small businesses to enterprise organizations.
              </p>
              <p className="text-muted-foreground mb-6">
                We bridge the gap between complex technology challenges and simple, 
                effective solutions. Our team of certified professionals brings years 
                of experience to every project, ensuring you receive the highest 
                quality service.
              </p>
              <div className="flex flex-col gap-3">
                {["Certified IT professionals", "Transparent pricing", "Real-time communication", "Quality guaranteed"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These core values guide everything we do
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                  <CardDescription>{value.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
        
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The dedicated professionals behind {settings.siteName}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarFallback className="text-lg">{member.initials}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        <section className="bg-muted/30 rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Work With Us?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Join hundreds of satisfied customers who trust us with their IT needs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2">ISO Certified</Badge>
            <Badge variant="outline" className="px-4 py-2">24/7 Support</Badge>
            <Badge variant="outline" className="px-4 py-2">Money-Back Guarantee</Badge>
            <Badge variant="outline" className="px-4 py-2">Secure & Reliable</Badge>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
