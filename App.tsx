import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Course, Lesson } from './types';
import FileSelector from './components/FileSelector';
import Sidebar from './components/Sidebar';
import ContentView from './components/ContentView';
import { LogoIcon } from './components/icons/LogoIcon';
import { PanelLeftCloseIcon } from './components/icons/PanelLeftCloseIcon';
import { PanelLeftOpenIcon } from './components/icons/PanelLeftOpenIcon';

const App: React.FC = () => {
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const allLessons = useMemo(() => {
    if (!course) return [];
    return course.sections.flatMap(section => section.lessons);
  }, [course]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLesson || allLessons.length === 0) return -1;
    return allLessons.findIndex(l => l.path === selectedLesson.path);
  }, [selectedLesson, allLessons]);
  
  const isLastLesson = currentLessonIndex >= 0 && currentLessonIndex === allLessons.length - 1;

  useEffect(() => {
    if (course) {
      try {
        const stored = localStorage.getItem(`completed_lessons_${course.name}`);
        if (stored) {
          setCompletedLessons(new Set(JSON.parse(stored)));
        } else {
          setCompletedLessons(new Set());
        }
      } catch (e) {
        console.error("Failed to load completed lessons from localStorage", e);
        setCompletedLessons(new Set());
      }
    }
  }, [course]);

  useEffect(() => {
    if (course) {
      try {
        localStorage.setItem(`completed_lessons_${course.name}`, JSON.stringify(Array.from(completedLessons)));
      } catch (e) {
        console.error("Failed to save completed lessons to localStorage", e);
      }
    }
  }, [completedLessons, course]);

  useEffect(() => {
    try {
      const storedRate = localStorage.getItem('video_playback_rate');
      if (storedRate) {
        setPlaybackRate(parseFloat(storedRate));
      }
    } catch (e) {
      console.error("Failed to load playback rate from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('video_playback_rate', String(playbackRate));
    } catch (e) {
      console.error("Failed to save playback rate to localStorage", e);
    }
  }, [playbackRate]);

  const handleCourseLoad = useCallback((loadedCourse: Course) => {
    setCourse(loadedCourse);
    setSelectedLesson(null); 
  }, []);

  const handleSelectLesson = useCallback((lesson: Lesson) => {
    setSelectedLesson(lesson);
  }, []);

  const handleToggleComplete = useCallback((lessonPath: string) => {
    setCompletedLessons(prev => {
      const newCompleted = new Set(prev);
      if (newCompleted.has(lessonPath)) {
        newCompleted.delete(lessonPath);
      } else {
        newCompleted.add(lessonPath);
      }
      return newCompleted;
    });
  }, []);

  const handleSelectNextLesson = useCallback(() => {
    if (currentLessonIndex !== -1 && !isLastLesson) {
      setSelectedLesson(allLessons[currentLessonIndex + 1]);
    }
  }, [currentLessonIndex, allLessons, isLastLesson]);

  if (!course) {
    return <FileSelector onCourseLoad={handleCourseLoad} />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar 
        course={course} 
        selectedLesson={selectedLesson}
        onSelectLesson={handleSelectLesson}
        completedLessons={completedLessons}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center shadow-md flex-shrink-0">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="p-1 mr-3 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-secondary"
              aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpenIcon className="h-6 w-6 text-gray-300" /> : <PanelLeftCloseIcon className="h-6 w-6 text-gray-300" />}
            </button>
            <LogoIcon className="h-8 w-8 text-brand-secondary" />
            <h1 className="text-xl font-bold ml-3 truncate">{course.name}</h1>
        </header>
        <ContentView 
          lesson={selectedLesson}
          completedLessons={completedLessons}
          onToggleComplete={handleToggleComplete}
          onSelectNext={handleSelectNextLesson}
          isLastLesson={isLastLesson}
          playbackRate={playbackRate}
          onPlaybackRateChange={setPlaybackRate}
        />
      </main>
    </div>
  );
};

export default App;