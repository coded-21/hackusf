'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { createCanvasAPI } from '@/lib/canvas';
import Link from 'next/link';

interface Course {
  id: number;
  name: string;
  course_code: string;
}

interface Assignment {
  id: number;
  name: string;
  due_at: string | null;
  course_id: number;
  html_url: string;
}

interface Announcement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  course_id: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
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
        setUser(user);

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

        setCourses(coursesData);
        setAssignments(upcomingAssignments);
        setAnnouncements(recentAnnouncements);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Canvas Dashboard Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </Link>
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Courses */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Courses</h2>
              <div className="space-y-3">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className="p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <h3 className="font-medium">{course.name}</h3>
                    <p className="text-sm text-gray-500">{course.course_code}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Assignments</h2>
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <a
                    key={assignment.id}
                    href={assignment.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <h3 className="font-medium">{assignment.name}</h3>
                    {assignment.due_at && (
                      <p className="text-sm text-gray-500">
                        Due: {new Date(assignment.due_at).toLocaleDateString()}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Announcements</h2>
              <div className="space-y-3">
                {announcements.map(announcement => (
                  <div
                    key={announcement.id}
                    className="p-3 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    <h3 className="font-medium">{announcement.title}</h3>
                    <p className="text-sm text-gray-500">
                      Posted: {new Date(announcement.posted_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 