import { useState, useRef, useEffect } from "react";
import { Send, Lock, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { MessageWithSender, UserRole } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";

interface ChatInterfaceProps {
  messages: MessageWithSender[];
  onSendMessage: (content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number) => void;
  onClose?: () => void;
  isOpen: boolean;
  isSending?: boolean;
  canSendPrivate?: boolean;
  canSendQuotation?: boolean;
  canClose?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case "admin":
      return "default";
    case "staff":
      return "secondary";
    default:
      return "outline";
  }
}

export function ChatInterface({
  messages,
  onSendMessage,
  onClose,
  isOpen,
  isSending = false,
  canSendPrivate = false,
  canSendQuotation = false,
  canClose = false,
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isQuotation, setIsQuotation] = useState(false);
  const [quotationAmount, setQuotationAmount] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() && !isQuotation) return;
    if (isQuotation && !quotationAmount) return;

    onSendMessage(
      message, 
      isPrivate, 
      isQuotation, 
      isQuotation ? parseInt(quotationAmount) : undefined
    );
    setMessage("");
    setIsPrivate(false);
    setIsQuotation(false);
    setQuotationAmount("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Chat is closed</p>
          <p className="text-sm">This conversation has been ended</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div>
          <h3 className="font-semibold">Chat</h3>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
        {canClose && onClose && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="mr-2 h-4 w-4" />
            Close Chat
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === user?.id;
              const showPrivate = msg.isPrivate && (user?.role === "admin" || msg.senderId === user?.id);

              if (msg.isPrivate && user?.role !== "admin" && msg.senderId !== user?.id) {
                return null;
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback 
                      className={`text-xs ${isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {getInitials(msg.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.sender.name}</span>
                      <Badge variant={getRoleBadgeVariant(msg.sender.role as UserRole)} className="text-xs">
                        {msg.sender.role}
                      </Badge>
                      {msg.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>

                    {msg.isQuotation ? (
                      <Card className={`${isOwn ? "bg-primary/10" : "bg-accent"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-lg">
                              ${msg.quotationAmount?.toLocaleString()}
                            </span>
                          </div>
                          {msg.content && (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : msg.isPrivate
                            ? "bg-accent/50 border border-dashed"
                            : "bg-accent"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    )}

                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-3">
        {(canSendPrivate || canSendQuotation) && (
          <div className="flex flex-wrap gap-4">
            {canSendPrivate && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(!!checked)}
                  data-testid="checkbox-private"
                />
                <Label htmlFor="private" className="text-sm flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Private (Admin only)
                </Label>
              </div>
            )}
            {canSendQuotation && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="quotation"
                  checked={isQuotation}
                  onCheckedChange={(checked) => setIsQuotation(!!checked)}
                  data-testid="checkbox-quotation"
                />
                <Label htmlFor="quotation" className="text-sm flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Quotation
                </Label>
              </div>
            )}
          </div>
        )}

        {isQuotation && (
          <Input
            type="number"
            placeholder="Enter amount"
            value={quotationAmount}
            onChange={(e) => setQuotationAmount(e.target.value)}
            className="max-w-xs"
            data-testid="input-quotation-amount"
          />
        )}

        <div className="flex gap-2">
          <Input
            placeholder={isQuotation ? "Add a description (optional)" : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            data-testid="input-message"
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || (!message.trim() && (!isQuotation || !quotationAmount))}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
