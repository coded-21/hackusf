'use client';

import { FC } from 'react';
import CourseChat from '@/components/CourseChat';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { use } from 'react';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

const CoursePage: FC<PageProps> = ({ params }) => {
  const { courseId } = use(params);

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center px-4 shrink-0">
        <Link 
          href="/dashboard" 
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-xl font-semibold ml-4">Course Assistant</h1>
        
        {/* PDF File Notice */}
        <div className="ml-auto flex items-center text-amber-600 text-sm">
          <Info className="h-4 w-4 mr-1" />
          <span>PDF files are processed on the server</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <CourseChat courseId={courseId} />
      </main>
    </div>
  );
};

export default CoursePage; 