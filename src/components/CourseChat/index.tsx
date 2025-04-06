'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import FileContextPanel from '@/components/FileContextPanel';
import { CourseFile, getCourseFiles, getFileContent } from '@/lib/courseFiles';

interface CourseChatProps {
  courseId: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CourseChat: FC<CourseChatProps> = ({ courseId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const courseFiles = await getCourseFiles(courseId);
        setFiles(courseFiles);
      } catch (error) {
        console.error('Error loading course files:', error);
      }
    };
    loadFiles();
  }, [courseId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggleFile = async (fileId: string) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
      // Load file content if not already loaded
      const file = files.find(f => f.id === fileId);
      if (file && !file.content) {
        try {
          const content = await getFileContent(file.url);
          setFiles(prev =>
            prev.map(f =>
              f.id === fileId ? { ...f, content } : f
            )
          );
        } catch (error) {
          console.error('Error loading file content:', error);
        }
      }
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get selected files' content
      const selectedFilesContent = files
        .filter(file => selectedFiles.has(file.id))
        .map(file => `Content from ${file.name}:\n${file.content}`)
        .join('\n\n');

      // Prepare the messages for the API
      const apiMessages = [
        ...messages,
        newMessage,
        ...(selectedFilesContent ? [{ role: 'system' as const, content: `Context from selected files:\n${selectedFilesContent}` }] : [])
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          courseId
        }),
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[calc(100%-16rem)]">
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center max-w-2xl mx-auto px-4">
                <h3 className="text-xl font-semibold mb-2">Course AI Assistant</h3>
                <p className="mb-4">Ask any question about your course materials!</p>
                <div className="text-sm">
                  <p>Examples:</p>
                  <ul className="mt-2 space-y-2">
                    <li>"Can you explain the concept of pipelining from Lecture 2.1?"</li>
                    <li>"What are the key points about RISC-V registers?"</li>
                    <li>"Summarize Chapter 5 about memory systems."</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input container - fixed at bottom */}
        <div className="border-t bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask a question about your course materials..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {selectedFiles.size > 0 
                ? `Using context from ${selectedFiles.size} selected file(s)`
                : 'Select course materials from the right panel to include as context'}
            </p>
          </div>
        </div>
      </div>

      {/* File context panel - fixed to right */}
      <div className="w-64 border-l bg-gray-50">
        <FileContextPanel
          files={files}
          onToggleFile={handleToggleFile}
          selectedFiles={selectedFiles}
        />
      </div>
    </div>
  );
};

export default CourseChat; 