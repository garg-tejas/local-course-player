
import React, { useCallback } from 'react';
import type { Course, Section, Lesson } from '../types';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { LogoIcon } from './icons/LogoIcon';

declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

declare global {
  interface File {
    readonly webkitRelativePath: string;
  }
}

interface FileSelectorProps {
  onCourseLoad: (course: Course) => void;
}

const getLessonType = (fileName: string): 'video' | 'pdf' | 'other' => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(extension)) return 'video';
  if (extension === 'pdf') return 'pdf';
  return 'other';
};

const FileSelector: React.FC<FileSelectorProps> = ({ onCourseLoad }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const rootPath = fileList[0].webkitRelativePath;
    const courseName = rootPath.split('/')[0] || 'My Course';
    const sectionsMap = new Map<string, Section>();

    for (const file of fileList) {
      const pathParts = file.webkitRelativePath.split('/');
      if (pathParts.length < 3) continue;

      const sectionName = pathParts[1];

      const lessonNameWithExt = pathParts[pathParts.length - 1];
      const lessonName = lessonNameWithExt.substring(0, lessonNameWithExt.lastIndexOf('.')) || lessonNameWithExt;


      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, { name: sectionName, lessons: [] });
      }

      const lessonType = getLessonType(file.name);
      if (lessonType === 'other') continue;

      const lesson: Lesson = {
        name: lessonName,
        type: lessonType,
        file: file,
        path: file.webkitRelativePath,
      };

      const section = sectionsMap.get(sectionName);
      if (section) {
        section.lessons.push(lesson);
      }
    }

    sectionsMap.forEach(section => {
      section.lessons.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    });

    const sections = Array.from(sectionsMap.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const course: Course = { name: courseName, sections };
    onCourseLoad(course);
  }, [onCourseLoad]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-gray-100">
      <div className="text-center p-8 max-w-lg">
        <LogoIcon className="h-24 w-24 mx-auto text-brand-secondary mb-6" />
        <h1 className="text-4xl font-extrabold text-white mb-2">Local Course Player</h1>
        <p className="text-lg text-gray-300 mb-8">
          Select your course folder to begin learning. All files are processed locally in your browser.
        </p>
        <label htmlFor="course-folder-input" className="relative cursor-pointer bg-brand-primary hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 inline-flex items-center">
          <FolderOpenIcon className="h-6 w-6 mr-3" />
          <span>Select Course Folder</span>
          <input
            id="course-folder-input"
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <p className="mt-6 text-sm text-gray-400">Your course folder should contain sub-folders for each section.</p>
      </div>
    </div>
  );
};

export default FileSelector;
