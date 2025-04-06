'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, AlertCircle } from 'lucide-react';
import FileContextPanel from '@/components/FileContextPanel';
import { CourseFile, getCourseFiles, getFileContent } from '@/lib/courseFiles';

interface CourseChatProps {
  courseId: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CourseChat: FC<CourseChatProps> = ({ courseId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFiles = async () => {
      setIsLoadingFiles(true);
      setError(null);
      
      try {
        const courseFiles = await getCourseFiles(courseId);
        setFiles(courseFiles);
      } catch (error) {
        console.error('Error loading course files:', error);
        
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes('Resource not found')) {
            setError(`Course ${courseId} not found. Please check the course ID.`);
          } else if (error.message.includes('Invalid Canvas API token')) {
            setError('Invalid Canvas API token. Please check your Canvas settings.');
          } else {
            setError(`Error loading course files: ${error.message}`);
          }
        } else {
          setError('An unknown error occurred while loading course files.');
        }
      } finally {
        setIsLoadingFiles(false);
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
      // If unselecting a file
      newSelectedFiles.delete(fileId);
    } else {
      // If selecting a new file
      newSelectedFiles.add(fileId);
      
      // Load file content if not already loaded
      const file = files.find(f => f.id === fileId);
      if (file && !file.content) {
        try {
          // Mark file as processing
          setProcessingFiles(prev => new Set(prev).add(fileId));
          
          // Extract content from the file
          const content = await getFileContent(file.url, file.name);
          
          // Update the file with its content
          setFiles(prev =>
            prev.map(f =>
              f.id === fileId ? { ...f, content } : f
            )
          );
        } catch (error) {
          console.error('Error loading file content:', error);
          
          // Update file with error message
          setFiles(prev =>
            prev.map(f =>
              f.id === fileId ? { ...f, content: `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}` } : f
            )
          );
        } finally {
          // Remove from processing state
          setProcessingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileId);
            return newSet;
          });
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
      // Prepare the chat history (excluding any previous system messages)
      const chatHistory = messages.filter(msg => msg.role !== 'system');
      
      // Get selected files with content
      const selectedFilesWithContent = files
        .filter(file => selectedFiles.has(file.id) && file.content);
      
      // Create a system message with the file context if we have selected files
      let apiMessages = [...chatHistory, newMessage];
      
      if (selectedFilesWithContent.length > 0) {
        // Format the file context with special handling for PDFs
        const selectedFilesContent = selectedFilesWithContent
          .map(file => {
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            const fileHeader = `File: ${file.name}${isPdf ? ' (PDF)' : ''}`;
            
            // For PDFs, add a note about the extraction method
            if (isPdf && file.content.includes('[This PDF file could not be processed')) {
              return `${fileHeader}\n[PDF content not available. Using the filename for context.]`;
            }
            
            return `${fileHeader}\n${file.content}`;
          })
          .join('\n\n');
          
        // Add the file context as a system message
        apiMessages.push({ 
          role: 'system', 
          content: `Context from selected files:\n${selectedFilesContent}` 
        });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          courseId
        }),
        credentials: 'include', // Include auth cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        }
        throw new Error('Failed to get response from AI assistant');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev.filter(msg => msg.role !== 'system'), newMessage, { 
        role: 'assistant', 
        content: data.message 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev.filter(msg => msg.role !== 'system'), newMessage, { 
        role: 'assistant', 
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get count of files currently being processed
  const processingFileCount = processingFiles.size;

  // Render error state if there's an error
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full bg-gray-50">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Course</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check that the course ID is correct and that you have permission to access this course.
          </p>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoadingFiles) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] w-full bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Loading Course Materials</h2>
          <p className="text-gray-500 mt-2">
            Fetching files from Canvas for course {courseId}...
          </p>
        </div>
      </div>
    );
  }

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
            messages.filter(msg => msg.role !== 'system').map((message, index) => (
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
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-gray-500">
                {processingFileCount > 0 && (
                  <span className="flex items-center text-amber-600">
                    <Loader2 size={12} className="animate-spin mr-1" />
                    Processing {processingFileCount} file(s)...
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 text-right">
                {files.length === 0 ? (
                  <span className="text-amber-600">
                    No course files found. 
                  </span>
                ) : selectedFiles.size > 0 ? (
                  <span className="flex items-center">
                    <FileText size={12} className="mr-1" />
                    Using context from {selectedFiles.size} selected file(s)
                  </span>
                ) : (
                  'Select course materials from the right panel to include as context'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File context panel - fixed to right */}
      <div className="w-64 border-l bg-gray-50">
        <FileContextPanel
          files={files}
          onToggleFile={handleToggleFile}
          selectedFiles={selectedFiles}
          processingFiles={processingFiles}
        />
      </div>
    </div>
  );
};

export default CourseChat; 