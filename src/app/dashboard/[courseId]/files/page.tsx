'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createCanvasAPI } from '@/lib/canvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileIcon, DownloadIcon, ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface CourseFile {
  id: string;
  filename: string;
  display_name: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export default function CourseFilesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchFiles = async () => {
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

        const files = await canvas.getCourseFiles(Number(courseId));
        setFiles(files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [courseId, router, supabase]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Course Files</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <FileIcon className="h-8 w-8 text-blue-500" />
                <div className="flex-1">
                  <h3 className="font-medium">{file.display_name}</h3>
                  <p className="text-sm text-gray-500">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-sm text-gray-500">
                    Updated: {new Date(file.updated_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {files.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No files found in this course.
          </p>
        )}
      </div>
    </>
  );
} 