'use client';

import { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { CourseFile } from '@/lib/courseFiles';
import { Loader2 } from 'lucide-react';
import FileSummarizer from '@/components/FileSummarizer';
import PDFDescriber from '@/components/PDFDescriber';

interface FileContextPanelProps {
  files: CourseFile[];
  onToggleFile: (fileId: string) => void;
  selectedFiles: Set<string>;
  processingFiles?: Set<string>;
}

const FileContextPanel: FC<FileContextPanelProps> = ({
  files,
  onToggleFile,
  selectedFiles,
  processingFiles = new Set(),
}) => {
  const selectedFilesList = files.filter(file => selectedFiles.has(file.id));
  const unselectedFilesList = files.filter(file => !selectedFiles.has(file.id));

  const FileItem = ({ file, showSummarizer = false }: { file: CourseFile; showSummarizer?: boolean }) => {
    const isProcessing = processingFiles.has(file.id);
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    
    return (
      <div
        key={file.id}
        className="flex flex-col p-2 bg-white rounded-lg shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
              {isProcessing && (
                <span className="ml-2 text-amber-600 text-xs">
                  (processing...)
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {getSimpleFileType(file.type)}
            </p>
          </div>
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Switch
              checked={selectedFiles.has(file.id)}
              onCheckedChange={() => onToggleFile(file.id)}
              className="data-[state=checked]:bg-blue-500"
            />
          )}
        </div>
        
        {/* Show the appropriate tool for selected files with content */}
        {showSummarizer && file.content && !isPDF && (
          <div className="mt-2">
            <FileSummarizer file={file} />
          </div>
        )}
      </div>
    );
  };

  // Get a simpler file type description
  const getSimpleFileType = (mimeType: string): string => {
    if (!mimeType || mimeType === 'unknown') return 'File';
    
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('docx')) return 'Word';
    if (mimeType.includes('presentation') || mimeType.includes('pptx')) return 'PowerPoint';
    if (mimeType.includes('text/')) return 'Text';
    if (mimeType.includes('image/')) return 'Image';
    
    // Return just the subtype (after the /)
    const parts = mimeType.split('/');
    if (parts.length === 2) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    
    return 'File';
  };

  return (
    <div className="h-full border-l bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">Course Materials</h2>
        <p className="text-sm text-gray-600 mt-1">
          Toggle files to include them as context when asking questions.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Selected Files Section */}
        {selectedFilesList.length > 0 && (
          <div className="p-4 border-b bg-blue-50">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Selected Files ({selectedFilesList.length})
            </h3>
            <div className="space-y-2">
              {selectedFilesList.map(file => (
                <FileItem key={file.id} file={file} showSummarizer={true} />
              ))}
            </div>
          </div>
        )}

        {/* Available Files Section */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Available Files ({unselectedFilesList.length})
          </h3>
          <div className="space-y-2">
            {unselectedFilesList.map(file => (
              <FileItem key={file.id} file={file} />
            ))}
            {files.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                No files available for this course.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileContextPanel; 