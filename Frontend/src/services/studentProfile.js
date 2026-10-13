// Student Profile Service for personalized AI tutoring
const PROFILE_KEY = 'ai_tutor_student_profile';

export const DEFAULT_PROFILE = {
  name: 'Adi',
  grade: 'Class 8-10 / Middle School',
  interests: 'Cricket, Science experiments, Video games',
  preferredLanguage: 'Hinglish (Hindi + English mix)',
  learningGoal: 'Conceptual clarity and step-by-step problem solving',
};

export function getStudentProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('[studentProfile] Failed to parse saved profile:', err);
  }
  return DEFAULT_PROFILE;
}

export function saveStudentProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('[studentProfile] Failed to save profile:', err);
  }
}
