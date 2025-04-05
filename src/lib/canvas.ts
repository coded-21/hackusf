interface CanvasConfig {
  domain: string;
  token: string;
}

interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  start_at: string | null;
  end_at: string | null;
  enrollment_term_id: number;
  term: {
    id: number;
    name: string;
    start_at: string | null;
    end_at: string | null;
  };
}

interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string | null;
  points_possible: number;
  html_url: string;
  course_id: number;
}

interface CanvasAnnouncement {
  id: number;
  title: string;
  message: string;
  posted_at: string;
  course_id: number;
}

interface CanvasFile {
  id: string;
  filename: string;
  display_name: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export class CanvasAPI {
  private domain: string;
  private token: string;

  constructor(config: CanvasConfig) {
    this.domain = config.domain.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch('/api/canvas/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Canvas data');
      }

      const { data } = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching from Canvas:', error);
      throw new Error('Unable to connect to Canvas. Please check your network connection and Canvas URL.');
    }
  }

  async getCurrentUser() {
    return this.fetch<any>('users/self/profile');
  }

  async getCourses() {
    return this.fetch<CanvasCourse[]>('courses?enrollment_state=active&include[]=term&per_page=100');
  }

  async getCourseAssignments(courseId: number) {
    return this.fetch<CanvasAssignment[]>(
      `courses/${courseId}/assignments?include[]=submission&order_by=due_at&per_page=100`
    );
  }

  async getCourseAnnouncements(courseId: number) {
    return this.fetch<CanvasAnnouncement[]>(
      `courses/${courseId}/announcements?per_page=10`
    );
  }

  async getCourseFiles(courseId: number) {
    return this.fetch<CanvasFile[]>(
      `courses/${courseId}/files?per_page=100`
    );
  }

  async getUpcomingAssignments() {
    try {
      const courses = await this.getCourses();
      const assignmentPromises = courses.map(async course => {
        try {
          const assignments = await this.getCourseAssignments(course.id);
          return assignments.map(assignment => ({
            ...assignment,
            courseName: course.name // Add course name to each assignment
          }));
        } catch (error) {
          console.log(`Skipping assignments for course ${course.name} (${course.id}): ${error.message}`);
          return [];
        }
      });

      const assignments = await Promise.all(assignmentPromises);
      
      return assignments
        .flat()
        .filter(assignment => {
          try {
            return assignment.due_at && new Date(assignment.due_at) > new Date();
          } catch (error: any) {
            console.log(`Skipping assignment with invalid due date:`, assignment);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            if (!a.due_at || !b.due_at) return 0;
            return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
          } catch (error) {
            console.log(`Error sorting assignments:`, { a, b, error });
            return 0;
          }
        });
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
      return [];
    }
  }

  async getRecentAnnouncements() {
    try {
      const courses = await this.getCourses();
      const announcementPromises = courses.map(async course => {
        try {
          const announcements = await this.getCourseAnnouncements(course.id);
          return announcements.map(announcement => ({
            ...announcement,
            courseName: course.name // Add course name to each announcement
          }));
        } catch (error) {
          console.log(`Skipping announcements for course ${course.name} (${course.id}): ${error.message}`);
          return [];
        }
      });

      const announcements = await Promise.all(announcementPromises);
      
      return announcements
        .flat()
        .sort((a, b) => {
          try {
            return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
          } catch (error: any) {
            console.log(`Error sorting announcements:`, { a, b, error });
            return 0;
          }
        });
    } catch (error) {
      console.error('Error fetching recent announcements:', error);
      return [];
    }
  }
}

export function createCanvasAPI(config: CanvasConfig) {
  return new CanvasAPI(config);
} 