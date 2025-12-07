import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Settings, User, Lock, Palette, Mail, Phone, Camera, Loader2, CheckCircle, XCircle, Eye, EyeOff, Globe, Upload, Image } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettingsData } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useAuth, getAuthHeader } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/lib/theme";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.string().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().optional(),
});

const whatsappSettingsSchema = z.object({
  enabled: z.boolean(),
  phoneNumberId: z.string().optional(),
  accessToken: z.string().optional(),
  apiVersion: z.string().optional(),
});

const siteSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;
type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;
type WhatsappSettingsFormData = z.infer<typeof whatsappSettingsSchema>;
type SiteSettingsFormData = z.infer<typeof siteSettingsSchema>;

interface NotificationSetting {
  id?: string;
  type: string;
  enabled: boolean;
  config: string | null;
}

interface SystemStatus {
  email: { enabled: boolean; configured: boolean };
  whatsapp: { enabled: boolean; configured: boolean };
}

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);

  const { data: systemStatus } = useQuery<SystemStatus>({
    queryKey: ["/api/system/status"],
    queryFn: async () => {
      const res = await fetch("/api/system/status", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch system status");
      return res.json();
    },
  });

  const { data: emailSetting } = useQuery<NotificationSetting>({
    queryKey: ["/api/admin/notification-settings", "email"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notification-settings/email", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch email settings");
      return res.json();
    },
  });

  const { data: whatsappSetting } = useQuery<NotificationSetting>({
    queryKey: ["/api/admin/notification-settings", "whatsapp"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notification-settings/whatsapp", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch whatsapp settings");
      return res.json();
    },
  });

  const { data: siteSettings } = useQuery<SiteSettingsData>({
    queryKey: ["/api/admin/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/site-settings", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch site settings");
      return res.json();
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
    },
  });

  const emailForm = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      enabled: false,
      host: "",
      port: "587",
      user: "",
      pass: "",
      from: "",
    },
  });

  const whatsappForm = useForm<WhatsappSettingsFormData>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      enabled: false,
      phoneNumberId: "",
      accessToken: "",
      apiVersion: "v18.0",
    },
  });

  const siteSettingsForm = useForm<SiteSettingsFormData>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      siteName: "",
      siteDescription: "",
      logoUrl: "",
      faviconUrl: "",
      metaTitle: "",
      metaDescription: "",
    },
  });

  useEffect(() => {
    if (emailSetting) {
      const config = emailSetting.config ? JSON.parse(emailSetting.config) : {};
      emailForm.reset({
        enabled: emailSetting.enabled,
        host: config.host || "",
        port: config.port || "587",
        user: config.user || "",
        pass: config.pass || "",
        from: config.from || "",
      });
    }
  }, [emailSetting]);

  useEffect(() => {
    if (whatsappSetting) {
      const config = whatsappSetting.config ? JSON.parse(whatsappSetting.config) : {};
      whatsappForm.reset({
        enabled: whatsappSetting.enabled,
        phoneNumberId: config.phoneNumberId || "",
        accessToken: config.accessToken || "",
        apiVersion: config.apiVersion || "v18.0",
      });
    }
  }, [whatsappSetting]);

  useEffect(() => {
    if (siteSettings) {
      siteSettingsForm.reset({
        siteName: siteSettings.siteName || "",
        siteDescription: siteSettings.siteDescription || "",
        logoUrl: siteSettings.logoUrl || "",
        faviconUrl: siteSettings.faviconUrl || "",
        metaTitle: siteSettings.metaTitle || "",
        metaDescription: siteSettings.metaDescription || "",
      });
    }
  }, [siteSettings]);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully" });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to change password", 
        variant: "destructive" 
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.user) {
        updateUser(data.user);
      }
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update profile", 
        variant: "destructive" 
      });
    },
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsFormData) => {
      const { enabled, ...config } = data;
      return apiRequest("PUT", "/api/admin/notification-settings/email", { enabled, config });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Email settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings", "email"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save email settings", variant: "destructive" });
    },
  });

  const saveWhatsappSettingsMutation = useMutation({
    mutationFn: async (data: WhatsappSettingsFormData) => {
      const { enabled, ...config } = data;
      return apiRequest("PUT", "/api/admin/notification-settings/whatsapp", { enabled, config });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "WhatsApp settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings", "whatsapp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save WhatsApp settings", variant: "destructive" });
    },
  });

  const saveSiteSettingsMutation = useMutation({
    mutationFn: async (data: SiteSettingsFormData) => {
      return apiRequest("PUT", "/api/admin/site-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Site settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save site settings", variant: "destructive" });
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const { url } = await res.json();
      
      const profileRes = await apiRequest("PUT", "/api/profile", { profilePhoto: url });
      const profileData = await profileRes.json();
      
      if (profileData.user) {
        updateUser(profileData.user);
      }
      
      toast({ title: "Success", description: "Profile photo updated" });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to upload photo", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload logo");
      }

      const { url } = await res.json();
      siteSettingsForm.setValue("logoUrl", url);
      toast({ title: "Success", description: "Logo uploaded. Click Save to apply." });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to upload logo", 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setIsUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload favicon");
      }

      const { url } = await res.json();
      siteSettingsForm.setValue("faviconUrl", url);
      toast({ title: "Success", description: "Favicon uploaded. Click Save to apply." });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to upload favicon", 
        variant: "destructive" 
      });
    } finally {
      setIsUploadingFavicon(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = "";
      }
    }
  };

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate({ 
      currentPassword: data.currentPassword, 
      newPassword: data.newPassword 
    });
  };

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your profile details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.profilePhoto || undefined} alt={user.name} />
                  <AvatarFallback className="text-lg">
                    {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  data-testid="input-photo-upload"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-upload-photo"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click the camera icon to upload a new photo</p>
              </div>
            </div>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            data-testid="input-profile-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your phone number"
                            data-testid="input-profile-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium text-sm" data-testid="text-profile-email">{user.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Role</Label>
                    <div>
                      <Badge variant="secondary" data-testid="badge-profile-role">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-update-profile"
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter current password"
                          data-testid="input-current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          data-testid="input-new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the application appearance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings (SMTP)
            </CardTitle>
            <CardDescription>
              Configure SMTP server for email notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit((data) => saveEmailSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Email Notifications</FormLabel>
                        <FormDescription>Send email notifications to users</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-email-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input placeholder="smtp.example.com" data-testid="input-smtp-host" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl>
                          <Input placeholder="587" data-testid="input-smtp-port" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={emailForm.control}
                    name="user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Username</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" data-testid="input-smtp-user" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="pass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showEmailPass ? "text" : "password"}
                              placeholder="Password"
                              data-testid="input-smtp-pass"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full"
                              onClick={() => setShowEmailPass(!showEmailPass)}
                              data-testid="button-toggle-smtp-pass"
                            >
                              {showEmailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={emailForm.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Address</FormLabel>
                      <FormControl>
                        <Input placeholder="noreply@example.com" data-testid="input-smtp-from" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={saveEmailSettingsMutation.isPending} data-testid="button-save-email">
                  {saveEmailSettingsMutation.isPending ? "Saving..." : "Save Email Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              WhatsApp Settings
            </CardTitle>
            <CardDescription>
              Configure WhatsApp Business API for notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...whatsappForm}>
              <form onSubmit={whatsappForm.handleSubmit((data) => saveWhatsappSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={whatsappForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Enable WhatsApp Notifications</FormLabel>
                        <FormDescription>Send WhatsApp messages to users</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-whatsapp-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={whatsappForm.control}
                  name="phoneNumberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Your WhatsApp Business Phone Number ID" data-testid="input-whatsapp-phone-id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={whatsappForm.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showWhatsappToken ? "text" : "password"}
                            placeholder="WhatsApp Cloud API Access Token"
                            data-testid="input-whatsapp-token"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                            data-testid="button-toggle-whatsapp-token"
                          >
                            {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={whatsappForm.control}
                  name="apiVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Version</FormLabel>
                      <FormControl>
                        <Input placeholder="v18.0" data-testid="input-whatsapp-api-version" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={saveWhatsappSettingsMutation.isPending} data-testid="button-save-whatsapp">
                  {saveWhatsappSettingsMutation.isPending ? "Saving..." : "Save WhatsApp Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Site Settings
            </CardTitle>
            <CardDescription>
              Configure your site branding and SEO settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...siteSettingsForm}>
              <form onSubmit={siteSettingsForm.handleSubmit((data) => saveSiteSettingsMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={siteSettingsForm.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My IT Services" data-testid="input-site-name" {...field} />
                      </FormControl>
                      <FormDescription>The name of your website displayed in browser tabs and headers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={siteSettingsForm.control}
                  name="siteDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Professional IT services for your business" 
                          data-testid="input-site-description" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>A brief description of your business</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={siteSettingsForm.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input 
                                placeholder="https://example.com/logo.png" 
                                data-testid="input-logo-url" 
                                {...field} 
                              />
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                                data-testid="input-logo-file"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                data-testid="button-upload-logo"
                              >
                                {isUploadingLogo ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {field.value && (
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <img 
                                  src={field.value} 
                                  alt="Logo preview" 
                                  className="h-8 max-w-[120px] object-contain"
                                  data-testid="img-logo-preview"
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Your site logo for the header</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={siteSettingsForm.control}
                    name="faviconUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Favicon</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input 
                                placeholder="https://example.com/favicon.ico" 
                                data-testid="input-favicon-url" 
                                {...field} 
                              />
                              <input
                                ref={faviconInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFaviconUpload}
                                className="hidden"
                                data-testid="input-favicon-file"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => faviconInputRef.current?.click()}
                                disabled={isUploadingFavicon}
                                data-testid="button-upload-favicon"
                              >
                                {isUploadingFavicon ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {field.value && (
                              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <img 
                                  src={field.value} 
                                  alt="Favicon preview" 
                                  className="h-6 w-6 object-contain"
                                  data-testid="img-favicon-preview"
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>Browser tab icon (16x16 or 32x32)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={siteSettingsForm.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="IT Services - Professional Tech Support" 
                          data-testid="input-meta-title" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>SEO title for search engines (recommended: 50-60 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={siteSettingsForm.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Professional IT services including tech support, network setup, and security solutions for businesses." 
                          data-testid="input-meta-description" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>SEO description for search engines (recommended: 150-160 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={saveSiteSettingsMutation.isPending} data-testid="button-save-site-settings">
                  {saveSiteSettingsMutation.isPending ? "Saving..." : "Save Site Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
