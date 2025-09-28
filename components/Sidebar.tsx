import React, { useState } from 'react';
import type { Course, Lesson, Section } from '../types';
import { VideoIcon } from './icons/VideoIcon';
import { PdfIcon } from './icons/PdfIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface SidebarProps {
  course: Course;
  selectedLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
  completedLessons: Set<string>;
  isSidebarCollapsed: boolean;
}

interface SectionItemProps {
  section: Section;
  selectedLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
  completedLessons: Set<string>;
}

const SectionItem: React.FC<SectionItemProps> = ({ section, selectedLesson, onSelectLesson, completedLessons }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left flex justify-between items-center p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
                <span className="font-semibold text-gray-100">{section.name}</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="mt-2 ml-2 border-l-2 border-gray-600">
                    {section.lessons.map(lesson => {
                        const isCompleted = completedLessons.has(lesson.path);
                        return (
                            <li key={lesson.path}>
                                <button
                                    onClick={() => onSelectLesson(lesson)}
                                    className={`w-full text-left flex items-center p-2 pl-4 rounded-r-md transition-colors ${
                                        selectedLesson?.path === lesson.path
                                            ? 'bg-brand-primary text-white'
                                            : `hover:bg-gray-700 hover:text-white ${isCompleted ? 'text-gray-400' : 'text-gray-300'}`
                                    }`}
                                >
                                    {isCompleted ? <CheckCircleIcon className="h-4 w-4 mr-3 flex-shrink-0 text-green-500" /> : (lesson.type === 'video' ? <VideoIcon className="h-4 w-4 mr-3 flex-shrink-0" /> : <PdfIcon className="h-4 w-4 mr-3 flex-shrink-0" />)}
                                    <span className="truncate">{lesson.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}


const Sidebar: React.FC<SidebarProps> = ({ course, selectedLesson, onSelectLesson, completedLessons, isSidebarCollapsed }) => {
  return (
    <aside className={`bg-gray-800 flex-shrink-0 flex flex-col border-r border-gray-700 transition-all duration-300 ease-in-out overflow-hidden ${isSidebarCollapsed ? 'w-0' : 'w-80'}`}>
      <div className="w-80 h-full flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white truncate">{course.name} Curriculum</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          {course.sections.map(section => (
              <SectionItem 
                  key={section.name} 
                  section={section} 
                  selectedLesson={selectedLesson}
                  onSelectLesson={onSelectLesson}
                  completedLessons={completedLessons}
              />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;