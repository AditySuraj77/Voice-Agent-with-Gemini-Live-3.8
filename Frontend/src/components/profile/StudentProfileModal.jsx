import React, { useState } from 'react';
import { X, Sparkles, User, Award, Heart, Check } from 'lucide-react';

export function StudentProfileModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) {
  const [name, setName] = useState(profile.name || 'Adi');
  const [grade, setGrade] = useState(profile.grade || 'Class 8-10 / Middle School');
  const [interests, setInterests] = useState(profile.interests || 'Cricket, Science experiments, Video games');
  const [preferredLanguage, setPreferredLanguage] = useState(profile.preferredLanguage || 'Hinglish (Hindi + English mix)');
  const [learningGoal, setLearningGoal] = useState(profile.learningGoal || 'Conceptual clarity and step-by-step problem solving');
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = {
      name: name.trim() || 'Student',
      grade: grade.trim(),
      interests: interests.trim(),
      preferredLanguage: preferredLanguage.trim(),
      learningGoal: learningGoal.trim(),
    };
    onSaveProfile(updated);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#fbf8f3] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-serif">Student Profile</h3>
              <p className="text-[11px] text-stone-500 font-sans">Personalize how Aristotle teaches you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <span>Student Name (आपका नाम)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adi, Aryan, Priya..."
              className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required
            />
            <p className="text-[10px] text-stone-400 mt-1">Teacher will address you by this name and record answers as "{name}: answer ✓".</p>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Current Grade / Level (कक्षा या लेवल)</span>
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. Class 9, Class 11 (JEE Prep), College CSE..."
              className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Interests & Hobbies (पसंदीदा उदाहरण)</span>
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. Cricket, Football, Gaming, Space, Marvel..."
              className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p className="text-[10px] text-stone-400 mt-1">The tutor uses your favorite hobbies for real-world analogies (e.g. physics of cricket spin)!</p>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Preferred Language (बोलने की भाषा)</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="Hinglish (Hindi + English mix)">Hinglish (Natural Hindi + English mix)</option>
              <option value="Hindi (शुद्ध हिंदी)">Hindi (हिंदी)</option>
              <option value="English">English</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Learning Focus (मुख्य उद्देश्य)</label>
            <input
              type="text"
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              placeholder="e.g. Deep concepts, Exam prep, Basics from scratch"
              className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Footer Save Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {savedToast ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
