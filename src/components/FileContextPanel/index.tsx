'use client';

import { FC } from 'react';
import { Switch } from '@/components/ui/switch';
import { CourseFile } from '@/lib/courseFiles';

interface FileContextPanelProps {
  files: CourseFile[];
  onToggleFile: (fileId: string) => void;
  selectedFiles: Set<string>;
}

const FileContextPanel: FC<FileContextPanelProps> = ({
  files,
  onToggleFile,
  selectedFiles,
}) => {
  const selectedFilesList = files.filter(file => selectedFiles.has(file.id));
  const unselectedFilesList = files.filter(file => !selectedFiles.has(file.id));

  const FileItem = ({ file }: { file: CourseFile }) => (
    <div
      key={file.id}
      className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm"
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">{file.type}</p>
      </div>
      <Switch
        checked={selectedFiles.has(file.id)}
        onCheckedChange={() => onToggleFile(file.id)}
        className="data-[state=checked]:bg-blue-500"
      />
    </div>
  );

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
                <FileItem key={file.id} file={file} />
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