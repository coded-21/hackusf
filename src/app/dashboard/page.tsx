'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { createCanvasAPI } from '@/lib/canvas';
import Link from 'next/link';
import AssignmentCalendar from '@/components/AssignmentCalendar';

interface Term {
  id: number;
  name: string;
  start_at: string | null;
  end_at: string | null;
}

interface Course {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
  term: Term;
}

interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  html_url: string;
  courseName?: string;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  course_id: number;
}

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Get Canvas credentials
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('canvas_token, canvas_domain')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        if (!userData?.canvas_token || !userData?.canvas_domain) {
          router.push('/settings');
          return;
        }

        // Initialize Canvas API
        const canvas = createCanvasAPI({
          domain: userData.canvas_domain,
          token: userData.canvas_token,
        });

        // Fetch Canvas data
        const [coursesData, upcomingAssignments, recentAnnouncements] = await Promise.all([
          canvas.getCourses(),
          canvas.getUpcomingAssignments(),
          canvas.getRecentAnnouncements(),
        ]);

        // Group courses by term
        const coursesByTerm = coursesData.reduce((acc, course) => {
          const termId = course.enrollment_term_id;
          if (!acc[termId]) {
            acc[termId] = {
              term: course.term,
              courses: []
            };
          }
          acc[termId].courses.push(course);
          return acc;
        }, {} as Record<number, { term: Term; courses: Course[] }>);

        // Find the term with the most courses (likely the current term)
        let currentTermData: Term | null = null;
        let maxCourses = 0;

        Object.values(coursesByTerm).forEach(({ term, courses }) => {
          // Prioritize terms with "Spring 25" in the name
          if (term.name.includes('Spring 25')) {
            currentTermData = term;
            return;
          }
          
          if (courses.length > maxCourses) {
            maxCourses = courses.length;
            currentTermData = term;
          }
        });

        setCurrentTerm(currentTermData);

        // Filter courses for current term
        const currentTermCourses = coursesData
          .filter(course => course.enrollment_term_id === currentTermData?.id)
          // Sort courses by name
          .sort((a, b) => a.name.localeCompare(b.name));

        setCourses(currentTermCourses);
        
        // Filter assignments to only show those from current term courses
        const currentTermAssignments = upcomingAssignments.filter(
          assignment => currentTermCourses.some(course => 
            course.id === assignment.course_id
          )
        );
        setAssignments(currentTermAssignments);

        // Filter announcements to only show those from current term courses
        const currentTermAnnouncements = recentAnnouncements.filter(
          announcement => currentTermCourses.some(course => 
            course.id === announcement.course_id
          )
        );
        setAnnouncements(currentTermAnnouncements);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Courses */}
        <div className="lg:col-span-1">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Current Term</h2>
              <p className="text-sm text-gray-500 mb-4">{currentTerm?.name || 'No active term'}</p>
              <h3 className="text-md font-medium text-gray-900 mb-3">Your Courses</h3>
              <div className="space-y-3">
                {courses.length > 0 ? (
                  courses.map(course => (
                    <div
                      key={course.id}
                      className="p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                    >
                      <h3 className="font-medium">{course.name}</h3>
                      <p className="text-sm text-gray-500">{course.course_code}</p>
                      <div className="mt-2 flex space-x-2">
                        <Link
                          href={`/dashboard/${course.id}/files`}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          View Files
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No courses found for the current term</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="bg-white overflow-hidden shadow rounded-lg mt-6">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Announcements</h2>
              <div className="space-y-3">
                {announcements.length > 0 ? (
                  announcements.map(announcement => (
                    <div
                      key={announcement.id}
                      className="p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                    >
                      <h3 className="font-medium">{announcement.title}</h3>
                      <p className="text-sm text-gray-500">
                        Posted: {new Date(announcement.posted_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No recent announcements</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="lg:col-span-3">
          <AssignmentCalendar assignments={assignments} />
        </div>
      </div>
    </>
  );
} 