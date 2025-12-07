import { Briefcase, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES, type Service } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
  onBook?: () => void;
  showStatus?: boolean;
  isAdmin?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
}

export function ServiceCard({ 
  service, 
  onBook, 
  showStatus = false, 
  isAdmin = false,
  onEdit,
  onToggleActive,
}: ServiceCardProps) {
  const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === service.category)?.label || service.category;

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {categoryLabel}
                </Badge>
                {showStatus && (
                  <Badge 
                    variant={service.isActive ? "default" : "secondary"}
                  >
                    {service.isActive ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-3 line-clamp-3">
          {service.description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-2 pt-0">
        {isAdmin ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              data-testid={`button-edit-service-${service.id}`}
            >
              Edit
            </Button>
            <Button 
              variant={service.isActive ? "secondary" : "default"}
              size="sm" 
              onClick={onToggleActive}
              data-testid={`button-toggle-service-${service.id}`}
            >
              {service.isActive ? "Deactivate" : "Activate"}
            </Button>
          </>
        ) : (
          <Button 
            className="w-full" 
            onClick={onBook}
            data-testid={`button-book-service-${service.id}`}
          >
            Book Service
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
