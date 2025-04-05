'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import AssignmentCalendar from '@/components/AssignmentCalendar';
import { useDashboard } from '@/lib/DashboardContext';

export default function Dashboard() {
  const { data, loading, error, fetchData } = useDashboard();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              <p className="text-sm text-gray-500 mb-4">{data?.currentTerm?.name || 'No active term'}</p>
              <h3 className="text-md font-medium text-gray-900 mb-3">Your Courses</h3>
              <div className="space-y-3">
                {data?.courses && data.courses.length > 0 ? (
                  data.courses.map(course => (
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
                {data?.announcements && data.announcements.length > 0 ? (
                  data.announcements.map(announcement => (
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
          <AssignmentCalendar assignments={data?.assignments || []} />
        </div>
      </div>
    </>
  );
} 