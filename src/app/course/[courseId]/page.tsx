'use client';

import { FC } from 'react';
import CourseChat from '@/components/CourseChat';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: {
    courseId: string;
  };
}

const CoursePage: FC<PageProps> = ({ params }) => {
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
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <CourseChat courseId={params.courseId} />
      </main>
    </div>
  );
};

export default CoursePage; 