import React from 'react';
import type { Lesson } from '../types';
import VideoPlayer from './VideoPlayer';
import PdfViewer from './PdfViewer';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface ContentViewProps {
  lesson: Lesson | null;
  completedLessons: Set<string>;
  onToggleComplete: (lessonPath: string) => void;
  onSelectNext: () => void;
  isLastLesson: boolean;
}

const ContentView: React.FC<ContentViewProps> = ({ lesson, completedLessons, onToggleComplete, onSelectNext, isLastLesson }) => {
  if (!lesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900 text-center">
        <BookOpenIcon className="h-24 w-24 text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-300">Welcome to your course!</h2>
        <p className="text-gray-400 mt-2">Select a lesson from the sidebar to get started.</p>
      </div>
    );
  }

  const isCompleted = completedLessons.has(lesson.path);

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white truncate" title={lesson.name}>{lesson.name}</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onToggleComplete(lesson.path)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center ${isCompleted
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-brand-secondary hover:bg-blue-500 text-white'
              }`}
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            {isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
          </button>
          {!isLastLesson && (
            <button
              onClick={onSelectNext}
              className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-600 hover:bg-gray-500 text-white transition-colors flex items-center"
            >
              <span>Next Lesson</span>
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 relative">
        {lesson.type === 'video' && <VideoPlayer file={lesson.file} onEnded={() => { if (!isCompleted) onToggleComplete(lesson.path) }} />}
        {lesson.type === 'pdf' && <PdfViewer file={lesson.file} />}
      </div>
    </div>
  );
};

export default ContentView;