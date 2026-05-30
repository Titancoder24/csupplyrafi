"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hi, I can help answer buyer questions about this property." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "This unit includes 2 dedicated parking spots. I can also help compare floorplan, pricing, and visit availability.",
        },
      ]);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-3"
          >
            <Card className="glass-panel h-[500px] w-[calc(100vw-32px)] overflow-hidden rounded-lg border-border p-0 sm:w-[380px]">
              <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <CardTitle className="text-[15px] font-bold text-foreground">Property AI</CardTitle>
                    <p className="text-[12px] font-medium text-muted-foreground">Buyer support</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </CardHeader>

              <CardContent className="min-h-0 flex-1 overflow-hidden bg-white p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  <div className="space-y-3 pb-4">
                    {messages.map((message, index) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3.5 py-3 text-[13px] leading-5 shadow-sm ${
                            message.role === "user"
                              ? "bg-primary text-white"
                              : "border border-border bg-surface-muted text-foreground"
                          }`}
                        >
                          {message.content}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="shrink-0 rounded-none border-t border-border bg-white p-3">
                <form onSubmit={handleSend} className="flex w-full items-center gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about price, parking..."
                    className="h-10 flex-1 border-border bg-white text-[13px] focus-visible:ring-primary/30"
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 rounded-md bg-primary hover:bg-[var(--viridian-600)]">
                    <Send className="h-4 w-4 text-white" strokeWidth={1.75} />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-lg border border-[var(--viridian-200)] bg-primary text-white shadow-xl shadow-[rgba(64,130,109,0.18)] transition-transform hover:scale-105 hover:bg-[var(--viridian-600)]"
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
