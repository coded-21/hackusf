'use client';

import { FC, useEffect, useState } from 'react';
import CourseChat from '@/components/CourseChat';
import Link from 'next/link';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { use } from 'react';
import { CanvasAPI } from '@/lib/canvas';
import Head from 'next/head';

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

const CoursePage: FC<PageProps> = ({ params }) => {
  const { courseId } = use(params);
  const [courseName, setCourseName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch course details
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        // Get Canvas API instance
        const canvasApi = await CanvasAPI.create();
        
        if (!canvasApi) {
          throw new Error('Could not initialize Canvas API');
        }
        
        // Fetch course details
        const courseDetails = await canvasApi.getCourseDetails(courseId);
        
        if (courseDetails && courseDetails.name) {
          setCourseName(courseDetails.name);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError('Could not load course details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseDetails();
  }, [courseId]);

  useEffect(() => {
    // Update document title when course name changes
    if (courseName) {
      document.title = `${courseName} - Course Assistant`;
    } else if (!loading) {
      document.title = 'Course Assistant';
    }
  }, [courseName, loading]);

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
        
        {/* Course Title */}
        <div className="ml-4 flex-1">
          {loading ? (
            <div className="flex items-center">
              <span className="text-xl font-semibold">Loading Course</span>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            </div>
          ) : (
            <h1 className="text-xl font-semibold truncate">{courseName || "Course Assistant"}</h1>
          )}
        </div>
        
        {/* PDF File Notice */}
        <div className="flex items-center text-amber-600 text-sm ml-2">
          <Info className="h-4 w-4 mr-1" />
          <span>PDF files are processed on the server</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <CourseChat courseId={courseId} courseName={courseName} />
      </main>
    </div>
  );
};

export default CoursePage; 