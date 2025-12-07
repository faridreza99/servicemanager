import { useState, useRef, useEffect } from "react";
import { Send, Lock, DollarSign, CheckCircle, Paperclip, FileText, Image, Loader2, X } from "lucide-react";
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
import { useAuth, getAuthHeader } from "@/lib/auth";

interface ChatInterfaceProps {
  messages: MessageWithSender[];
  onSendMessage: (content: string, isPrivate: boolean, isQuotation?: boolean, quotationAmount?: number, attachmentUrl?: string, attachmentType?: string) => void;
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
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/cloudinary", {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload file");
      }

      const data = await response.json();
      setAttachmentUrl(data.url);
      setAttachmentType(file.type || "application/octet-stream");
      setAttachmentName(file.name);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearAttachment = () => {
    setAttachmentUrl(null);
    setAttachmentType(null);
    setAttachmentName(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() && !isQuotation && !attachmentUrl) return;
    if (isQuotation && !quotationAmount) return;

    onSendMessage(
      message || (attachmentUrl ? "Shared a file" : ""), 
      isPrivate, 
      isQuotation, 
      isQuotation ? parseInt(quotationAmount) : undefined,
      attachmentUrl || undefined,
      attachmentType || undefined
    );
    setMessage("");
    setIsPrivate(false);
    setIsQuotation(false);
    setQuotationAmount("");
    clearAttachment();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div>
          <h3 className="font-semibold">Chat</h3>
          <p className="text-sm text-muted-foreground">{messages.length} messages</p>
        </div>
        {isOpen && canClose && onClose && (
          <Button 
            variant="default" 
            size="sm"
            onClick={onClose}
            data-testid="button-approve-work"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Work
          </Button>
        )}
        {!isOpen && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Work Approved
          </Badge>
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
                        {msg.attachmentUrl && (
                          <div className="mb-2">
                            {msg.attachmentType?.startsWith("image/") ? (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt="Attachment" 
                                  className="max-w-full max-h-48 rounded-md cursor-pointer"
                                  data-testid={`attachment-image-${msg.id}`}
                                />
                              </a>
                            ) : (
                              <a 
                                href={msg.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-md ${isOwn ? "bg-primary-foreground/10" : "bg-background/50"}`}
                                data-testid={`attachment-file-${msg.id}`}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm underline">View Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content && (!msg.attachmentUrl || msg.content !== "Shared a file") && (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
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

      {isOpen ? (
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

        {attachmentUrl && (
          <div className="flex items-center gap-2 px-3 py-2 bg-accent rounded-md">
            {attachmentType?.startsWith("image/") ? (
              <Image className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm flex-1 truncate">{attachmentName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearAttachment}
              className="h-6 w-6"
              data-testid="button-clear-attachment"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            data-testid="input-file"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploading}
            data-testid="button-attach-file"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
          <Input
            placeholder={isQuotation ? "Add a description (optional)" : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || isUploading}
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            onClick={handleSend} 
            disabled={isSending || isUploading || (!message.trim() && !attachmentUrl && (!isQuotation || !quotationAmount))}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      ) : (
      <div className="p-4 border-t text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          <span className="text-sm">This chat has been approved and is now read-only</span>
        </div>
      </div>
      )}
    </div>
  );
}
