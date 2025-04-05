import { createContext, useContext, useState, useCallback } from 'react';
import { createCanvasAPI } from './canvas';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

interface DashboardData {
  courses: Course[];
  currentTerm: Term | null;
  assignments: Assignment[];
  announcements: Announcement[];
  lastFetched: number | null;
}

interface DashboardContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  clearData: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const clearData = useCallback(() => {
    setData(null);
  }, []);

  const fetchData = useCallback(async () => {
    // If data exists and was fetched less than 5 minutes ago, use cached data
    if (data && data.lastFetched && Date.now() - data.lastFetched < 5 * 60 * 1000) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('canvas_token, canvas_domain')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (!userData?.canvas_token || !userData?.canvas_domain) {
        throw new Error('Canvas credentials not found');
      }

      const canvas = createCanvasAPI({
        domain: userData.canvas_domain,
        token: userData.canvas_token,
      });

      const [coursesData, upcomingAssignments, recentAnnouncements] = await Promise.all([
        canvas.getCourses(),
        canvas.getUpcomingAssignments(),
        canvas.getRecentAnnouncements(),
      ]);

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

      let currentTermData: Term | null = null;
      let maxCourses = 0;

      Object.values(coursesByTerm).forEach(({ term, courses }) => {
        if (term.name.includes('Spring 25')) {
          currentTermData = term;
          return;
        }
        
        if (courses.length > maxCourses) {
          maxCourses = courses.length;
          currentTermData = term;
        }
      });

      const currentTermCourses = coursesData
        .filter(course => course.enrollment_term_id === currentTermData?.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      const currentTermAssignments = upcomingAssignments.filter(
        assignment => currentTermCourses.some(course => 
          course.id === assignment.course_id
        )
      );

      const currentTermAnnouncements = recentAnnouncements.filter(
        announcement => currentTermCourses.some(course => 
          course.id === announcement.course_id
        )
      );

      setData({
        courses: currentTermCourses,
        currentTerm: currentTermData,
        assignments: currentTermAssignments,
        announcements: currentTermAnnouncements,
        lastFetched: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [data, supabase]);

  return (
    <DashboardContext.Provider value={{ data, loading, error, fetchData, clearData }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
} 