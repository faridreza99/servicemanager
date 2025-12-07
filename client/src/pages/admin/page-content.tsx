import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { getAuthHeader } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  name: string;
  role: string;
  initials: string;
}

interface Value {
  icon: string;
  title: string;
  description: string;
}

interface Stat {
  value: string;
  label: string;
}

interface MissionContent {
  title: string;
  description: string;
  secondaryDescription?: string;
  highlights: string[];
}

interface CtaContent {
  title: string;
  description: string;
  badges: string[];
}

interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

interface BusinessHour {
  day: string;
  hours: string;
}

export default function AdminPageContentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("about");

  const { data: aboutContent, isLoading: aboutLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/page-content", "about"],
    queryFn: async () => {
      const res = await fetch("/api/admin/page-content/about", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch about content");
      return res.json();
    },
  });

  const { data: contactContent, isLoading: contactLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/page-content", "contact"],
    queryFn: async () => {
      const res = await fetch("/api/admin/page-content/contact", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch contact content");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ page, section, content }: { page: string; section: string; content: any }) => {
      const res = await apiRequest("PUT", `/api/admin/page-content/${page}/${section}`, content);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/page-content", variables.page] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/page-content", variables.page] });
      toast({
        title: "Content Updated",
        description: "The page content has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update content",
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Page Content</h1>
          <p className="text-muted-foreground">
            Manage the content displayed on public About and Contact pages.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="about" data-testid="tab-about">About Page</TabsTrigger>
            <TabsTrigger value="contact" data-testid="tab-contact">Contact Page</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-6 mt-6">
            {aboutLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <AboutPageEditor
                content={aboutContent || {}}
                onSave={(section, content) => updateMutation.mutate({ page: "about", section, content })}
                isPending={updateMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6 mt-6">
            {contactLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ContactPageEditor
                content={contactContent || {}}
                onSave={(section, content) => updateMutation.mutate({ page: "contact", section, content })}
                isPending={updateMutation.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function AboutPageEditor({
  content,
  onSave,
  isPending,
}: {
  content: Record<string, any>;
  onSave: (section: string, content: any) => void;
  isPending: boolean;
}) {
  const [mission, setMission] = useState<MissionContent>({
    title: content.mission?.title || "Our Mission",
    description: content.mission?.description || "We believe that technology should empower, not complicate. Our mission is to make professional IT services accessible to everyone.",
    secondaryDescription: content.mission?.secondaryDescription || "We bridge the gap between complex technology challenges and simple, effective solutions.",
    highlights: content.mission?.highlights || ["Certified IT professionals", "Transparent pricing", "Real-time communication", "Quality guaranteed"],
  });

  const [values, setValues] = useState<Value[]>(
    content.values || [
      { icon: "Target", title: "Excellence", description: "We strive for excellence in every service we provide." },
      { icon: "Users", title: "Customer Focus", description: "Our customers are at the heart of everything we do." },
      { icon: "Shield", title: "Integrity", description: "We operate with transparency and honesty." },
      { icon: "Award", title: "Innovation", description: "We continuously evolve our services." },
    ]
  );

  const [team, setTeam] = useState<TeamMember[]>(
    content.team || [
      { name: "Alex Johnson", role: "CEO & Founder", initials: "AJ" },
      { name: "Sarah Chen", role: "CTO", initials: "SC" },
      { name: "Mike Williams", role: "Head of Operations", initials: "MW" },
      { name: "Emily Davis", role: "Customer Success Lead", initials: "ED" },
    ]
  );

  const [stats, setStats] = useState<Stat[]>(
    content.stats || [
      { value: "500+", label: "Services Completed" },
      { value: "99%", label: "Customer Satisfaction" },
      { value: "24/7", label: "Support Available" },
      { value: "10+", label: "Years Experience" },
    ]
  );

  const [cta, setCta] = useState<CtaContent>({
    title: content.cta?.title || "Ready to Work With Us?",
    description: content.cta?.description || "Join hundreds of satisfied customers who trust us with their IT needs.",
    badges: content.cta?.badges || ["ISO Certified", "24/7 Support", "Money-Back Guarantee", "Secure & Reliable"],
  });

  const addTeamMember = () => {
    setTeam([...team, { name: "", role: "", initials: "" }]);
  };

  const removeTeamMember = (index: number) => {
    setTeam(team.filter((_, i) => i !== index));
  };

  const addValue = () => {
    setValues([...values, { icon: "Star", title: "", description: "" }]);
  };

  const removeValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const addStat = () => {
    setStats([...stats, { value: "", label: "" }]);
  };

  const removeStat = (index: number) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Mission Section</CardTitle>
            <CardDescription>The main mission statement displayed on the About page</CardDescription>
          </div>
          <Button
            onClick={() => onSave("mission", mission)}
            disabled={isPending}
            data-testid="button-save-mission"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mission-title">Title</Label>
            <Input
              id="mission-title"
              value={mission.title}
              onChange={(e) => setMission({ ...mission, title: e.target.value })}
              data-testid="input-mission-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mission-desc">Primary Description</Label>
            <Textarea
              id="mission-desc"
              value={mission.description}
              onChange={(e) => setMission({ ...mission, description: e.target.value })}
              rows={3}
              data-testid="input-mission-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mission-desc2">Secondary Description</Label>
            <Textarea
              id="mission-desc2"
              value={mission.secondaryDescription}
              onChange={(e) => setMission({ ...mission, secondaryDescription: e.target.value })}
              rows={3}
              data-testid="input-mission-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label>Highlights (one per line)</Label>
            <Textarea
              value={mission.highlights.join("\n")}
              onChange={(e) => setMission({ ...mission, highlights: e.target.value.split("\n").filter(h => h.trim()) })}
              rows={4}
              placeholder="Certified IT professionals&#10;Transparent pricing&#10;..."
              data-testid="input-mission-highlights"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Stats</CardTitle>
            <CardDescription>Key statistics displayed on the About page</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addStat} data-testid="button-add-stat">
              <Plus className="h-4 w-4 mr-2" />
              Add Stat
            </Button>
            <Button onClick={() => onSave("stats", stats)} disabled={isPending} data-testid="button-save-stats">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Value (e.g. 500+)"
                  value={stat.value}
                  onChange={(e) => {
                    const newStats = [...stats];
                    newStats[index] = { ...stat, value: e.target.value };
                    setStats(newStats);
                  }}
                  data-testid={`input-stat-value-${index}`}
                />
                <Input
                  placeholder="Label"
                  value={stat.label}
                  onChange={(e) => {
                    const newStats = [...stats];
                    newStats[index] = { ...stat, label: e.target.value };
                    setStats(newStats);
                  }}
                  data-testid={`input-stat-label-${index}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStat(index)}
                  data-testid={`button-remove-stat-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Values</CardTitle>
            <CardDescription>Core values displayed on the About page</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addValue} data-testid="button-add-value">
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
            <Button onClick={() => onSave("values", values)} disabled={isPending} data-testid="button-save-values">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {values.map((value, index) => (
            <div key={index} className="flex items-start gap-2 border rounded-md p-4">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Icon (Target, Users, Shield, Award, Star)"
                    value={value.icon}
                    onChange={(e) => {
                      const newValues = [...values];
                      newValues[index] = { ...value, icon: e.target.value };
                      setValues(newValues);
                    }}
                    data-testid={`input-value-icon-${index}`}
                  />
                  <Input
                    placeholder="Title"
                    value={value.title}
                    onChange={(e) => {
                      const newValues = [...values];
                      newValues[index] = { ...value, title: e.target.value };
                      setValues(newValues);
                    }}
                    data-testid={`input-value-title-${index}`}
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={value.description}
                  onChange={(e) => {
                    const newValues = [...values];
                    newValues[index] = { ...value, description: e.target.value };
                    setValues(newValues);
                  }}
                  rows={2}
                  data-testid={`input-value-description-${index}`}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeValue(index)}
                data-testid={`button-remove-value-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Team members displayed on the About page</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addTeamMember} data-testid="button-add-team">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
            <Button onClick={() => onSave("team", team)} disabled={isPending} data-testid="button-save-team">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {team.map((member, index) => (
              <div key={index} className="flex items-center gap-2 border rounded-md p-4">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => {
                      const newTeam = [...team];
                      newTeam[index] = { ...member, name: e.target.value };
                      setTeam(newTeam);
                    }}
                    data-testid={`input-team-name-${index}`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Role"
                      value={member.role}
                      onChange={(e) => {
                        const newTeam = [...team];
                        newTeam[index] = { ...member, role: e.target.value };
                        setTeam(newTeam);
                      }}
                      data-testid={`input-team-role-${index}`}
                    />
                    <Input
                      placeholder="Initials"
                      value={member.initials}
                      onChange={(e) => {
                        const newTeam = [...team];
                        newTeam[index] = { ...member, initials: e.target.value };
                        setTeam(newTeam);
                      }}
                      data-testid={`input-team-initials-${index}`}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTeamMember(index)}
                  data-testid={`button-remove-team-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Call to Action Section</CardTitle>
            <CardDescription>The CTA section at the bottom of the About page</CardDescription>
          </div>
          <Button onClick={() => onSave("cta", cta)} disabled={isPending} data-testid="button-save-cta">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-title">Title</Label>
            <Input
              id="cta-title"
              value={cta.title}
              onChange={(e) => setCta({ ...cta, title: e.target.value })}
              data-testid="input-cta-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-desc">Description</Label>
            <Textarea
              id="cta-desc"
              value={cta.description}
              onChange={(e) => setCta({ ...cta, description: e.target.value })}
              rows={2}
              data-testid="input-cta-description"
            />
          </div>
          <div className="space-y-2">
            <Label>Badges (one per line)</Label>
            <Textarea
              value={cta.badges.join("\n")}
              onChange={(e) => setCta({ ...cta, badges: e.target.value.split("\n").filter(b => b.trim()) })}
              rows={4}
              placeholder="ISO Certified&#10;24/7 Support&#10;..."
              data-testid="input-cta-badges"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactPageEditor({
  content,
  onSave,
  isPending,
}: {
  content: Record<string, any>;
  onSave: (section: string, content: any) => void;
  isPending: boolean;
}) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: content.contactInfo?.email || "support@example.com",
    phone: content.contactInfo?.phone || "+1 (555) 123-4567",
    address: content.contactInfo?.address || "123 Tech Street, Silicon Valley, CA 94000",
  });

  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    content.businessHours || [
      { day: "Monday - Friday", hours: "9:00 AM - 6:00 PM" },
      { day: "Saturday", hours: "10:00 AM - 4:00 PM" },
      { day: "Sunday", hours: "Closed" },
    ]
  );

  const addBusinessHour = () => {
    setBusinessHours([...businessHours, { day: "", hours: "" }]);
  };

  const removeBusinessHour = (index: number) => {
    setBusinessHours(businessHours.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Contact details displayed on the Contact page</CardDescription>
          </div>
          <Button
            onClick={() => onSave("contactInfo", contactInfo)}
            disabled={isPending}
            data-testid="button-save-contact-info"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactInfo.email}
              onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              data-testid="input-contact-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              type="tel"
              value={contactInfo.phone}
              onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              data-testid="input-contact-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-address">Address</Label>
            <Textarea
              id="contact-address"
              value={contactInfo.address}
              onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
              rows={2}
              data-testid="input-contact-address"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Operating hours displayed on the Contact page</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addBusinessHour} data-testid="button-add-hours">
              <Plus className="h-4 w-4 mr-2" />
              Add Hours
            </Button>
            <Button onClick={() => onSave("businessHours", businessHours)} disabled={isPending} data-testid="button-save-hours">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {businessHours.map((hours, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Day(s)"
                  value={hours.day}
                  onChange={(e) => {
                    const newHours = [...businessHours];
                    newHours[index] = { ...hours, day: e.target.value };
                    setBusinessHours(newHours);
                  }}
                  data-testid={`input-hours-day-${index}`}
                />
                <Input
                  placeholder="Hours"
                  value={hours.hours}
                  onChange={(e) => {
                    const newHours = [...businessHours];
                    newHours[index] = { ...hours, hours: e.target.value };
                    setBusinessHours(newHours);
                  }}
                  data-testid={`input-hours-time-${index}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBusinessHour(index)}
                  data-testid={`button-remove-hours-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
