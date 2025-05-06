"use client"

import type React from "react"

import { MessageBubble } from "@/components/message-bubble"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { motion } from "framer-motion"
import { CharacterType } from '@/components/voicevox/types'

type Message = {
  role: "user" | "assistant"
  content: string
  translation?: string
}

interface ChatInterfaceProps {
  messages: Message[]
  input: string
  setInput: (input: string) => void
  sendMessage: (e: React.FormEvent) => void
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>,
  character: CharacterType
}

export function ChatInterface({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  character,
  messagesEndRef,
}: ChatInterfaceProps) {
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 z-10">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageBubble character={character} message={message} />
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground rounded-lg p-3 max-w-[80%]">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: "600ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
