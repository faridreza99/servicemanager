import { useQuery } from "@tanstack/react-query";
import { useSiteSettings } from "@/lib/site-settings";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Target, Users, Award, CheckCircle, Star, Loader2 } from "lucide-react";

const iconMap: Record<string, typeof Target> = {
  Target,
  Users,
  Shield,
  Award,
  Star,
};

const defaultTeamMembers = [
  { name: "Alex Johnson", role: "CEO & Founder", initials: "AJ" },
  { name: "Sarah Chen", role: "CTO", initials: "SC" },
  { name: "Mike Williams", role: "Head of Operations", initials: "MW" },
  { name: "Emily Davis", role: "Customer Success Lead", initials: "ED" },
];

const defaultValues = [
  {
    icon: "Target",
    title: "Excellence",
    description: "We strive for excellence in every service we provide, ensuring top-quality solutions.",
  },
  {
    icon: "Users",
    title: "Customer Focus",
    description: "Our customers are at the heart of everything we do. Your success is our priority.",
  },
  {
    icon: "Shield",
    title: "Integrity",
    description: "We operate with transparency and honesty, building trust with every interaction.",
  },
  {
    icon: "Award",
    title: "Innovation",
    description: "We continuously evolve our services to meet the changing needs of the IT landscape.",
  },
];

const defaultStats = [
  { value: "500+", label: "Services Completed" },
  { value: "99%", label: "Customer Satisfaction" },
  { value: "24/7", label: "Support Available" },
  { value: "10+", label: "Years Experience" },
];

const defaultMission = {
  title: "Our Mission",
  description: "We believe that technology should empower, not complicate. Our mission is to make professional IT services accessible to everyone, from small businesses to enterprise organizations.",
  secondaryDescription: "We bridge the gap between complex technology challenges and simple, effective solutions. Our team of certified professionals brings years of experience to every project, ensuring you receive the highest quality service.",
  highlights: ["Certified IT professionals", "Transparent pricing", "Real-time communication", "Quality guaranteed"],
};

const defaultCta = {
  title: "Ready to Work With Us?",
  description: "Join hundreds of satisfied customers who trust us with their IT needs.",
  badges: ["ISO Certified", "24/7 Support", "Money-Back Guarantee", "Secure & Reliable"],
};

export default function AboutPage() {
  const { settings } = useSiteSettings();
  
  const { data: content, isLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/public/page-content", "about"],
  });

  const mission = content?.mission || defaultMission;
  const values = content?.values || defaultValues;
  const team = content?.team || defaultTeamMembers;
  const stats = content?.stats || defaultStats;
  const cta = content?.cta || defaultCta;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PublicLayout>
    );
  }
  
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">About Us</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-about-title">
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
              <h2 className="text-3xl font-bold mb-6" data-testid="text-mission-title">{mission.title}</h2>
              <p className="text-muted-foreground mb-4" data-testid="text-mission-description">
                {mission.description}
              </p>
              {mission.secondaryDescription && (
                <p className="text-muted-foreground mb-6">
                  {mission.secondaryDescription}
                </p>
              )}
              <div className="flex flex-col gap-3">
                {mission.highlights?.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span data-testid={`text-highlight-${i}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat: { value: string; label: string }, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary" data-testid={`text-stat-value-${index}`}>{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-stat-label-${index}`}>{stat.label}</p>
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
            {values.map((value: { icon: string; title: string; description: string }, index: number) => {
              const IconComponent = iconMap[value.icon] || Target;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg" data-testid={`text-value-title-${index}`}>{value.title}</CardTitle>
                    <CardDescription data-testid={`text-value-desc-${index}`}>{value.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
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
            {team.map((member: { name: string; role: string; initials: string; photoUrl?: string }, index: number) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    {member.photoUrl && <AvatarImage src={member.photoUrl} alt={member.name} />}
                    <AvatarFallback className="text-lg">{member.initials}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold" data-testid={`text-team-name-${index}`}>{member.name}</h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-team-role-${index}`}>{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        <section className="bg-muted/30 rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">{cta.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6" data-testid="text-cta-description">
            {cta.description}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {cta.badges?.map((badge: string, index: number) => (
              <Badge key={index} variant="outline" className="px-4 py-2" data-testid={`badge-cta-${index}`}>{badge}</Badge>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
