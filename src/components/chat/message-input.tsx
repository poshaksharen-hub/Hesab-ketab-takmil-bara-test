
'use client';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2 space-x-reverse">
      <Input
        type="text"
        placeholder="پیام خود را بنویسید..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1"
        autoComplete="off"
      />
      <Button type="submit">
        <Send className="h-4 w-4" />
        <span className="sr-only">ارسال</span>
      </Button>
    </form>
  );
}
