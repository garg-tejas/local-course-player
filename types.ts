
export interface Lesson {
  name: string;
  type: 'video' | 'pdf';
  file: File;
  path: string;
}

export interface Section {
  name: string;
  lessons: Lesson[];
}

export interface Course {
  name: string;
  sections: Section[];
}
