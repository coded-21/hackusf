'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import FileContextPanel from '@/components/FileContextPanel';
import { CourseFile, getCourseFiles, getFileContent } from '@/lib/courseFiles';
import { toast } from "sonner";

interface CourseChatProps {
  courseId: string;
  courseName?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CourseChat: FC<CourseChatProps> = ({ courseId, courseName = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use formatted course name or default
  const displayCourseName = courseName || `Course ${courseId}`;

  const resetChat = () => {
    // Clear all messages
    setMessages([]);
    // Clear selected files
    setSelectedFiles(new Set());
    // Show confirmation
    toast.success("Chat history cleared");
  };

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
            setError(`${displayCourseName} not found. Please check the course ID.`);
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

  // Create a function to force sending a specific message
  const forceSendMessage = (text: string) => {
    const forcedMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, forcedMessage]);
    setIsLoading(true);
    
    // Process the forced message
    processChatRequest(text, forcedMessage);
  };

  // Create a separate function to process chat requests
  const processChatRequest = async (inputText: string, userMessage: Message) => {
    try {
      // Prepare the chat history
      const chatHistory = messages.filter(msg => msg.role !== 'system');
      
      // Get selected files with content
      const selectedFilesWithContent = files
        .filter(file => selectedFiles.has(file.id) && file.content);
      
      // Create the API messages array
      let apiMessages = [...chatHistory, userMessage];
      
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
          courseId,
          courseName
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
      
      // Update the messages with the AI response corresponding to this specific user message
      setMessages(prev => {
        // Find the index of the user message we're responding to
        const userMsgIndex = prev.findIndex(
          msg => msg.role === 'user' && msg.content === inputText
        );
        
        if (userMsgIndex === -1) {
          // If the user message is no longer in the chat (unusual case), 
          // just append the assistant response
          return [...prev.filter(msg => msg.role !== 'system'), { 
            role: 'assistant', 
            content: data.message 
          }];
        }
        
        // Create a new array with all messages, inserting the assistant response
        // right after the corresponding user message
        const updatedMessages = [...prev];
        
        // Check if there's already an assistant response after this user message
        if (userMsgIndex + 1 < updatedMessages.length && 
            updatedMessages[userMsgIndex + 1].role === 'assistant') {
          // Replace the existing assistant response
          updatedMessages[userMsgIndex + 1] = { 
            role: 'assistant', 
            content: data.message 
          };
        } else {
          // Insert a new assistant response after the user message
          updatedMessages.splice(userMsgIndex + 1, 0, { 
            role: 'assistant', 
            content: data.message 
          });
        }
        
        return updatedMessages.filter(msg => msg.role !== 'system');
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Find the user message we're responding to
      setMessages(prev => {
        const userMsgIndex = prev.findIndex(
          msg => msg.role === 'user' && msg.content === inputText
        );
        
        if (userMsgIndex === -1) {
          // If we can't find the user message, just append the error
          return [...prev.filter(msg => msg.role !== 'system'), { 
            role: 'assistant', 
            content: error instanceof Error 
              ? `Error: ${error.message}` 
              : 'Sorry, I encountered an error. Please try again.'
          }];
        }
        
        // Create a new array with all messages, inserting the error message
        const updatedMessages = [...prev];
        
        // Check if there's already an assistant response after this user message
        if (userMsgIndex + 1 < updatedMessages.length && 
            updatedMessages[userMsgIndex + 1].role === 'assistant') {
          // Replace the existing assistant response
          updatedMessages[userMsgIndex + 1] = { 
            role: 'assistant', 
            content: error instanceof Error 
              ? `Error: ${error.message}` 
              : 'Sorry, I encountered an error. Please try again.'
          };
        } else {
          // Insert a new assistant response after the user message
          updatedMessages.splice(userMsgIndex + 1, 0, { 
            role: 'assistant', 
            content: error instanceof Error 
              ? `Error: ${error.message}` 
              : 'Sorry, I encountered an error. Please try again.'
          });
        }
        
        return updatedMessages.filter(msg => msg.role !== 'system');
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Create a new user message
    const newMessage: Message = { role: 'user', content: input };
    
    // Clear input immediately to prevent accidental double-sends
    const userInput = input;
    setInput('');
    
    // Check if this is a duplicate of the last message (user sending the same text)
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    if (lastMessage && lastMessage.role === 'user' && lastMessage.content === userInput) {
      console.log('Preventing duplicate message');
      // Show toast notification for duplicate message
      toast.info(
        <div>
          <p>You already sent this message.</p>
          <button 
            onClick={() => {
              // Force send the message with a slight modification to bypass duplicate check
              forceSendMessage(userInput + ' '); 
            }}
            className="mt-2 text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
          >
            Send anyway
          </button>
        </div>
      );
      setIsDuplicateWarning(true);
      // Reset the warning after 3 seconds
      setTimeout(() => setIsDuplicateWarning(false), 3000);
      // Set the input back to show the user what they typed
      setInput(userInput);
      return;
    }
    setIsDuplicateWarning(false);
    
    // Add the new message to the chat
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    // Process the chat request
    processChatRequest(userInput, newMessage);
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
            Please check that you have permission to access this course.
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
            Fetching files from Canvas for {displayCourseName}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[calc(100%-16rem)]">
        {/* PDF processing info message */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-end">
          <div className="flex items-center text-amber-700 text-xs">
            <FileText size={12} className="mr-1" />
            <span>PDF files are processed on the server</span>
          </div>
        </div>
        
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Reset button - only visible when there are messages */}
          {messages.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={resetChat}
                className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw size={12} className="mr-1" />
                Reset Chat
              </button>
            </div>
          )}
          
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center max-w-2xl mx-auto px-4">
                <h3 className="text-xl font-semibold mb-2">{displayCourseName} Assistant</h3>
                <p className="mb-4">Ask any question about your course materials!</p>
                <div className="text-sm">
                  <p>Examples:</p>
                  <ul className="mt-2 space-y-2">
                    <li>"Can you explain the concept of pipelining from Lecture 2.1?"</li>
                    <li>"What are the key points about RISC-V registers?"</li>
                    <li>"Summarize Chapter 5 about memory systems."</li>
                    <li>"Help me understand the formulas in the Formula List PDF."</li>
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
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-pre:bg-gray-200 prose-pre:p-2 prose-pre:rounded prose-headings:text-gray-800 prose-strong:font-semibold">
                      {message.content.split('\n').map((line, i) => {
                        // Check if line starts with special formatting
                        const isListItem = /^\s*[-•*]\s/.test(line) || /^\s*\d+\.\s/.test(line);
                        const isHeading = /^#{1,6}\s/.test(line);
                        const isCodeBlock = /^\s*```/.test(line);
                        
                        // Process text with Markdown and technical formatting
                        const processText = (text: string): string => {
                          // Handle various markdown formatting
                          let processedText = text;
                          
                          // Bold: **text**
                          processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                          
                          // Italic: *text* or _text_
                          processedText = processedText.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
                          
                          // Inline code: `code`
                          processedText = processedText.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded font-mono text-sm">$1</code>');
                          
                          // Handle technical terms like register names
                          processedText = processedText.replace(/\b([xasft][0-9]{1,2}|zero|ra|sp|gp|tp|fp)\b/g, 
                            (match: string) => `<span class="font-mono bg-gray-200 px-1 rounded">${match}</span>`);
                          
                          return processedText;
                        };
                        
                        // Improved detection for asterisks to prevent conflicts with bold
                        if (line.trim().startsWith('**') && !line.trim().startsWith('***')) {
                          // This is likely a bold text starting with '**', not a list item
                          return <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ 
                            __html: processText(line) 
                          }} />;
                        }

                        if (isListItem) {
                          // Process the line content, removing the list marker
                          const content = line.replace(/^\s*[-•*]\s/, '').replace(/^\s*\d+\.\s/, '');
                          return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ 
                            __html: processText(content) 
                          }} />;
                        } else if (isHeading) {
                          const level = line.match(/^(#+)\s/)?.[1].length || 1;
                          const text = line.replace(/^#+\s/, '');
                          
                          const formattedText = processText(text);
                          
                          switch(level) {
                            case 1: return <h3 key={i} className="text-lg font-bold mt-3 mb-2" dangerouslySetInnerHTML={{ __html: formattedText }} />;
                            case 2: return <h4 key={i} className="text-md font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formattedText }} />;
                            default: return <h5 key={i} className="text-sm font-medium mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formattedText }} />;
                          }
                        } else if (isCodeBlock) {
                          // Simple code block detection - not perfect but good enough for this context
                          return <pre key={i} className="bg-gray-200 p-2 rounded font-mono text-xs mt-2 mb-3">{line.replace(/```(\w+)?/, '')}</pre>;
                        } else if (!line.trim()) {
                          return <div key={i} className="h-2"></div>; // Empty line as spacing
                        } else {
                          return <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ 
                            __html: processText(line) 
                          }} />;
                        }
                      })}
                    </div>
                  ) : (
                    message.content
                  )}
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
                onChange={(e) => {
                  setInput(e.target.value);
                  if (isDuplicateWarning) setIsDuplicateWarning(false);
                }}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask a question about your course materials..."
                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                  isDuplicateWarning ? 'border-amber-400 bg-amber-50' : ''
                }`}
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