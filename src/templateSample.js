import { initData } from './utils.js';
export const templateSample = {
  ...initData,
  personal: { ...initData.personal, firstName: 'Alex', lastName: 'Morgan', title: 'Product Designer', email: 'alex@example.com', location: 'Bengaluru, India', website: 'example.com/portfolio' },
  summary: 'Sample resume for template preview. Product designer focused on clear interfaces, accessible experiences and practical solutions. This fictional content illustrates the layout.',
  experience: [{ id: 1, jobTitle: 'Product Designer', company: 'Example Studio', location: 'Bengaluru', startDate: '2022-04', endDate: '', current: true, bullets: '• Designed clear onboarding journeys with product and engineering teams.\n• Conducted research sessions and translated findings into interface improvements.\n• Maintained reusable components and documented accessibility decisions.' }, { id: 2, jobTitle: 'Junior Designer', company: 'Sample Company', location: 'Remote', startDate: '2020-06', endDate: '2022-03', current: false, bullets: '• Created wireframes, prototypes and visual specifications.\n• Collaborated with developers to review delivered experiences.' }],
  education: [{ id: 1, school: 'Example University', degree: 'Bachelor of Design', field: 'Communication Design', startDate: '2016-07', endDate: '2020-05' }],
  skills: [{ id: 1, category: 'Design', skills: ['User research', 'Interaction design', 'Prototyping', 'Design systems'] }, { id: 2, category: 'Tools', skills: ['Figma', 'FigJam', 'HTML', 'CSS'] }],
  projects: [{ id: 1, name: 'Accessible onboarding', tech: 'Research · UI design', link: '', desc: 'A sample project demonstrating a focused approach to simplifying complex workflows.' }],
  certifications: [{ id: 1, name: 'Accessibility Fundamentals', issuer: 'Example Academy', date: '2023-06' }],
  languages: [{ id: 1, language: 'English', proficiency: 'Fluent' }]
};
