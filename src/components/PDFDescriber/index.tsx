'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { CourseFile } from '@/lib/courseFiles';

interface PDFDescriberProps {
  file: CourseFile;
}

// This component provides a fallback when PDF parsing isn't working
// It uses the file name to make a best guess at what the PDF contains
const PDFDescriber: FC<PDFDescriberProps> = ({ file }) => {
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDescribe = async () => {
    setIsLoading(true);
    setError(null);
    setDescription(null);

    try {
      // Call the chat API with the file name to get AI to guess what the PDF contains
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'user', 
              content: `Based on its filename "${file.name}", what would you expect this PDF document to contain? What topics might it cover? This is for a file in a course context.` 
            }
          ],
          courseId: 'unknown'
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to get description: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDescription(data.message || 'No description available');
    } catch (err) {
      console.error('Error getting file description:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center mb-2 text-amber-600 text-xs">
        <FileText className="h-3 w-3 mr-1" />
        <span>PDF analysis uses the filename when content is unavailable</span>
      </div>
      
      <Button 
        onClick={handleDescribe}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white" 
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          'what\'s in this PDF?'
        )}
      </Button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {description && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="font-semibold mb-2 text-amber-800">About {file.name}</h3>
          <div className="whitespace-pre-line text-sm text-amber-900">{description}</div>
          <p className="mt-3 text-xs text-amber-600 italic">This is an AI prediction based only on the filename, not the actual content.</p>
        </div>
      )}
    </div>
  );
};

export default PDFDescriber; 