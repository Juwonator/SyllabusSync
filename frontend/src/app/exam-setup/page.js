'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import BottomNav from '@/components/BottomNav';

export default function ExamSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Core selections
  const [examType, setExamType] = useState('WAEC/SSCE');
  const [mode, setMode] = useState('practice');
  const [modeLabel, setModeLabel] = useState('Practice');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(40);
  const [year, setYear] = useState('');
  const [duration, setDuration] = useState({ hours: 1, minutes: 30, seconds: 0 });
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [selectedSections, setSelectedSections] = useState(['objective']);
  const [availableSections, setAvailableSections] = useState(['objective']);

  // Dynamic data from backend
  const [subjectsList, setSubjectsList] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [yearsList, setYearsList] = useState([]);

  // Topics & subtopics
  const [allTopics, setAllTopics] = useState([]);
  const [allSubtopics, setAllSubtopics] = useState([]);
  const [combinedItems, setCombinedItems] = useState([]);

  // UI state
  const [openCard, setOpenCard] = useState('exam');
  const [completedSteps, setCompletedSteps] = useState({
    exam: false, mode: false, subjects: false, sections: false,
    topicsSubtopics: false, config: false, options: false
  });

  // Map exam type to exam_id for years API
  const examIdMap = {
    'WAEC/SSCE': 1,
    'NECO': 2,
    'JAMB/UTME': 3,
    'GCE': 4,
    'JUPEB': 5
  };

  // Fetch subjects (filtered by exam)
  useEffect(() => {
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/subjects?exam=${examType}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjectsList(res.data.subjects || []);
      } catch (err) {
        console.error('Failed to fetch subjects', err);
        setSubjectsList([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [examType]);

  // Fetch years for selected exam
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const token = localStorage.getItem('token');
        const examId = examIdMap[examType];
        const res = await axios.get(`http://localhost:5000/api/exams/years?exam_id=${examId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYearsList(res.data.years || []);
        if (res.data.years?.length && !res.data.years.some(y => y.year === year)) {
          setYear(res.data.years[0].year);
        }
      } catch (err) {
        console.error('Failed to fetch years', err);
        setYearsList([{ year: '2023' }, { year: '2022' }, { year: '2021' }]);
        if (!year) setYear('2023');
      }
    };
    if (examType) fetchYears();
  }, [examType]);

  // Determine available sections (Objective / Theory) for SSCE exams
  useEffect(() => {
    const theoryExams = ['WAEC/SSCE', 'NECO', 'GCE', 'JUPEB'];
    if (theoryExams.includes(examType)) {
      setAvailableSections(['objective', 'theory']);
      if (selectedSections.length === 0) setSelectedSections(['objective']);
    } else {
      setAvailableSections(['objective']);
      setSelectedSections(['objective']);
    }
  }, [examType]);

  // Fetch topics & subtopics when subjects change
  useEffect(() => {
    if (selectedSubjects.length === 0) {
      setAllTopics([]);
      setAllSubtopics([]);
      setCombinedItems([]);
      return;
    }
    const fetchTopicsAndSubtopics = async () => {
      try {
        const token = localStorage.getItem('token');
        // Topics
        const topicsRes = await axios.post('http://localhost:5000/api/topics/by-subjects',
          { subject_ids: selectedSubjects },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const topics = (topicsRes.data.topics || []).map(t => ({
          id: t.id, name: t.name, type: 'topic', parentId: null
        }));
        const topicIds = topics.map(t => t.id);
        let subtopics = [];
        if (topicIds.length) {
          const subRes = await axios.post('http://localhost:5000/api/subtopics/by-topics',
            { topic_ids: topicIds },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          subtopics = (subRes.data.subtopics || []).map(st => ({
            id: st.id, name: st.name, topic_name: st.topic_name,
            parentTopicId: st.topic_id, type: 'subtopic'
          }));
        }
        setAllTopics(topics);
        setAllSubtopics(subtopics);

        // Combine: topics first, then indented subtopics
        const combined = [];
        topics.forEach(topic => {
          combined.push({ ...topic, displayName: topic.name });
          const childSubs = subtopics.filter(st => st.parentTopicId === topic.id);
          childSubs.forEach(sub => {
            combined.push({ ...sub, displayName: `↳ ${sub.name}`, indent: true });
          });
        });
        setCombinedItems(combined);
      } catch (err) {
        console.error('Failed to fetch topics/subtopics', err);
        setCombinedItems([]);
      }
    };
    fetchTopicsAndSubtopics();
  }, [selectedSubjects]);

  // Helper to check if an item (topic/subtopic) is selected
  const isSelected = (item) => {
    if (item.type === 'topic') return selectedTopics.includes(item.id);
    if (item.type === 'subtopic') return selectedSubtopics.includes(item.id);
    return false;
  };

  const toggleItem = (item) => {
    if (item.type === 'topic') {
      setSelectedTopics(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
    } else if (item.type === 'subtopic') {
      setSelectedSubtopics(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
    }
  };

  const selectAllItems = () => {
    const allTopicIds = allTopics.map(t => t.id);
    const allSubIds = allSubtopics.map(s => s.id);
    if (selectedTopics.length === allTopicIds.length && selectedSubtopics.length === allSubIds.length) {
      setSelectedTopics([]);
      setSelectedSubtopics([]);
    } else {
      setSelectedTopics(allTopicIds);
      setSelectedSubtopics(allSubIds);
    }
  };

  // Update completed steps
  useEffect(() => {
    setCompletedSteps({
      exam: !!examType,
      mode: !!mode,
      subjects: selectedSubjects.length >= 1,
      sections: availableSections.length === 1 || selectedSections.length > 0,
      topicsSubtopics: true, // optional
      config: !!(questionCount && year),
      options: !!(duration.hours > 0 || duration.minutes > 0)
    });
  }, [examType, mode, selectedSubjects, selectedSections, availableSections, questionCount, year, duration]);

  const totalSteps = 7;
  const progressPercent = Object.values(completedSteps).filter(v => v).length * (100 / totalSteps);

  const toggleCard = (cardName) => {
    setOpenCard(openCard === cardName ? null : cardName);
  };

  const selectExam = (exam) => {
    setExamType(exam);
    setCompletedSteps(prev => ({ ...prev, exam: true }));
    setOpenCard('mode');
  };

  const selectMode = (modeKey, label) => {
    setMode(modeKey);
    setModeLabel(label);
    setCompletedSteps(prev => ({ ...prev, mode: true }));
    if (modeKey === 'mock') {
      setDuration({ hours: 2, minutes: 0, seconds: 0 });
      setShowExplanations(false);
    } else if (modeKey === 'study') {
      setShowExplanations(true);
    }
    setOpenCard('subjects');
  };

  const toggleSubject = (subjectId) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    } else {
      if (selectedSubjects.length >= 5) {
        alert('You can select a maximum of 5 subjects');
        return;
      }
      setSelectedSubjects(prev => [...prev, subjectId]);
    }
  };

  const selectQuestionCount = (count) => setQuestionCount(count);
  const selectYear = (yr) => {
    setYear(yr);
    setCompletedSteps(prev => ({ ...prev, config: true }));
    setOpenCard('options');
  };

  const updateDuration = (field, value) => {
    if (mode === 'mock') return;
    setDuration(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
    setCompletedSteps(prev => ({ ...prev, options: true }));
  };

  const formatDuration = () => `${String(duration.hours).padStart(2, '0')}:${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`;

  const handleStartExam = async () => {
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        user_id: user?.id,
        exam_id: examIdMap[examType] || 1,
        exam_year_id: null,
        subject_ids: selectedSubjects,
        topic_ids: selectedTopics,
        subtopic_ids: selectedSubtopics,
        selected_sections: selectedSections,
        mode: mode,
        total_questions: questionCount,
        duration_minutes: mode === 'mock' ? 120 : (duration.hours * 60 + duration.minutes),
        is_timed: mode !== 'study',
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        show_explanations: showExplanations
      };

      const res = await axios.post('http://localhost:5000/api/cbt/start-session', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessionId = res.data.session.id;
      router.push(`/cbt/${sessionId}`);
    } catch (err) {
      console.error('Failed to start session', err);
      alert('Failed to start exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const examTypes = [
    { key: 'WAEC/SSCE', label: 'WAEC / SSCE', sub: 'West Africa' },
    { key: 'NECO', label: 'NECO', sub: 'National' },
    { key: 'JAMB/UTME', label: 'JAMB / UTME', sub: 'University' },
    { key: 'GCE', label: 'GCE', sub: 'Cambridge' },
    { key: 'JUPEB', label: 'JUPEB', sub: 'Pre-degree' }
  ];

  const modes = [
    { key: 'practice', label: 'Practice Mode', desc: 'Instant feedback after each answer', badge: 'DEFAULT', badgeClass: 'badge-green', icon: '⚡' },
    { key: 'study', label: 'Study Mode', desc: 'See explanations as you go', badge: 'LEARN', badgeClass: 'badge-blue', icon: '📖' },
    { key: 'mock', label: 'Mock Exam', desc: 'Real exam conditions, 2 hr locked timer', badge: 'STRICT', badgeClass: 'badge-amber', icon: '🎯' }
  ];

  // Helper to get the correct step number for display
  const stepNumber = (stepName) => {
    const order = ['exam', 'mode', 'subjects', 'sections', 'topicsub', 'config', 'options'];
    return order.indexOf(stepName) + 1;
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Top nav */}
      <div className="bg-green-900 px-4 pb-4 pt-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2"/></svg>
        </button>
        <div className="text-white font-bold text-lg flex-1">Practice CBT</div>
        <div className="px-2 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase">
          {mode === 'practice' ? 'PRACTICE' : mode === 'study' ? 'STUDY' : 'MOCK EXAM'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/20">
        <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {/* Step 1: Exam Type */}
        <div className={`bg-white rounded-xl border ${openCard === 'exam' ? 'shadow-sm' : ''}`}>
          <button onClick={() => toggleCard('exam')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.exam ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.exam ? '✓' : stepNumber('exam')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Exam Type</div>
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">{examType}</div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'exam' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'exam' && (
            <div className="border-t p-3">
              <div className="grid grid-cols-2 gap-2">
                {examTypes.map(exam => (
                  <button key={exam.key} onClick={() => selectExam(exam.key)} className={`p-3 rounded-xl border text-center transition ${examType === exam.key ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                    <div className="font-bold text-sm text-gray-800">{exam.label}</div>
                    <div className="text-[10px] text-gray-400">{exam.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Mode */}
        <div className={`bg-white rounded-xl border ${openCard === 'mode' ? 'shadow-sm' : ''} ${!completedSteps.exam ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => completedSteps.exam && toggleCard('mode')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.mode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.mode ? '✓' : stepNumber('mode')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Practice Mode</div>
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">{modeLabel}</div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'mode' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'mode' && completedSteps.exam && (
            <div className="border-t p-3">
              <div className="space-y-2">
                {modes.map(m => (
                  <button key={m.key} onClick={() => selectMode(m.key, m.label)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${mode === m.key ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                    <div className={`w-3 h-3 rounded-full border-2 ${mode === m.key ? 'border-green-600 bg-green-600' : 'border-gray-300'}`} />
                    <div className="flex-1 text-left">
                      <div className="font-bold text-sm text-gray-800">{m.icon} {m.label}</div>
                      <div className="text-[10px] text-gray-500">{m.desc}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${m.badgeClass === 'badge-green' ? 'bg-green-100 text-green-800' : m.badgeClass === 'badge-blue' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{m.badge}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Subjects */}
        <div className={`bg-white rounded-xl border ${openCard === 'subjects' ? 'shadow-sm' : ''} ${!completedSteps.mode ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => completedSteps.mode && toggleCard('subjects')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.subjects ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.subjects ? '✓' : stepNumber('subjects')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Subjects</div>
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded max-w-[150px] truncate">
              {selectedSubjects.length > 0 ? `${selectedSubjects.length} selected` : 'Select'}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'subjects' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'subjects' && completedSteps.mode && (
            <div className="border-t p-3">
              {isLoadingSubjects ? (
                <div className="text-center py-4 text-gray-500">Loading subjects...</div>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-2">Select 1–5 subjects</div>
                  <div className="grid grid-cols-2 gap-2">
                    {subjectsList.map(subj => (
                      <button key={subj.id} onClick={() => toggleSubject(subj.id)} className={`flex items-center gap-2 p-2 rounded-lg border transition ${selectedSubjects.includes(subj.id) ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                        <div className={`w-4 h-4 rounded border ${selectedSubjects.includes(subj.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'} flex items-center justify-center`}>
                          {selectedSubjects.includes(subj.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2"/></svg>}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-800">{subj.name}</div>
                          <div className="text-[10px] text-gray-400">{subj.question_count || 0} questions</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-amber-600 mt-2">
                    {selectedSubjects.length === 0 && '⚠️ Please select at least 1 subject'}
                    {selectedSubjects.length === 5 && '⚠️ Maximum 5 subjects selected'}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 4: Sections (only if multiple sections exist) */}
        {availableSections.length > 1 && (
          <div className={`bg-white rounded-xl border ${openCard === 'sections' ? 'shadow-sm' : ''} ${!completedSteps.subjects ? 'opacity-50 pointer-events-none' : ''}`}>
            <button onClick={() => completedSteps.subjects && toggleCard('sections')} className="w-full flex items-center gap-2 p-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${selectedSections.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {selectedSections.length > 0 ? '✓' : stepNumber('sections')}
              </div>
              <div className="flex-1 text-left font-semibold text-gray-700">Sections</div>
              <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {selectedSections.join(', ')}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'sections' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
            {openCard === 'sections' && completedSteps.subjects && (
              <div className="border-t p-3">
                <div className="text-sm text-gray-600 mb-2">Select sections to include:</div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedSections.includes('objective')} onChange={(e) => {
                      if (e.target.checked) setSelectedSections(prev => [...prev, 'objective']);
                      else setSelectedSections(prev => prev.filter(s => s !== 'objective'));
                    }} />
                    <span>Objective (Multiple Choice)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedSections.includes('theory')} onChange={(e) => {
                      if (e.target.checked) setSelectedSections(prev => [...prev, 'theory']);
                      else setSelectedSections(prev => prev.filter(s => s !== 'theory'));
                    }} />
                    <span>Theory (Essay)</span>
                  </label>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {selectedSections.length === 0 && '⚠️ Please select at least one section'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Topics & Subtopics (combined) */}
        <div className={`bg-white rounded-xl border ${openCard === 'topicsub' ? 'shadow-sm' : ''} ${!completedSteps.subjects ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => completedSteps.subjects && toggleCard('topicsub')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.topicsSubtopics ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.topicsSubtopics ? '✓' : stepNumber('topicsub')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Topics / Subtopics (Optional)</div>
            <div className="text-xs font-mono text-gray-500 px-2 py-0.5 rounded">
              {selectedTopics.length + selectedSubtopics.length > 0 ? `${selectedTopics.length + selectedSubtopics.length} selected` : 'All'}
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'topicsub' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'topicsub' && completedSteps.subjects && (
            <div className="border-t p-3">
              {combinedItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No topics/subtopics available for selected subjects.</div>
              ) : (
                <>
                  <button onClick={selectAllItems} className="mb-3 text-sm text-green-700 font-medium flex items-center gap-1">
                    <div className={`w-4 h-4 rounded border ${(selectedTopics.length === allTopics.length && selectedSubtopics.length === allSubtopics.length) ? 'bg-green-600 border-green-600' : 'border-gray-300'} flex items-center justify-center`}>
                      {(selectedTopics.length === allTopics.length && selectedSubtopics.length === allSubtopics.length) && <svg className="w-3 h-3 text-white" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2"/></svg>}
                    </div>
                    {(selectedTopics.length === allTopics.length && selectedSubtopics.length === allSubtopics.length) ? 'Deselect All' : 'Select All Topics & Subtopics'}
                  </button>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {combinedItems.map(item => (
                      <button key={`${item.type}-${item.id}`} onClick={() => toggleItem(item)} className={`w-full flex items-center gap-2 p-2 rounded-lg border ${isSelected(item) ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 rounded border ${isSelected(item) ? 'bg-green-600 border-green-600' : 'border-gray-300'} flex items-center justify-center`}>
                          {isSelected(item) && <svg className="w-3 h-3 text-white" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2"/></svg>}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-sm ${item.type === 'topic' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{item.displayName}</div>
                          {item.type === 'subtopic' && <div className="text-[10px] text-gray-400">Sub‑topic of {item.topic_name}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 6: Questions & Year */}
        <div className={`bg-white rounded-xl border ${openCard === 'config' ? 'shadow-sm' : ''} ${!completedSteps.subjects ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => completedSteps.subjects && toggleCard('config')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.config ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.config ? '✓' : stepNumber('config')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Questions & Year</div>
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">{questionCount} Qs · {year}</div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'config' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'config' && completedSteps.subjects && (
            <div className="border-t p-3">
              <div className="mb-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Number of Questions</div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 20, 40, 50, 60].map(n => (
                    <button key={n} onClick={() => selectQuestionCount(n)} className={`w-12 py-2 rounded-lg text-sm font-mono transition ${questionCount === n ? 'bg-green-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Year</div>
                <div className="grid grid-cols-4 gap-1">
                  {yearsList.map(yr => (
                    <button key={yr.id} onClick={() => selectYear(yr.year)} className={`py-2 rounded-lg text-xs font-mono transition ${year === yr.year ? 'bg-green-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>{yr.year}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 7: Duration & Options */}
        <div className={`bg-white rounded-xl border ${openCard === 'options' ? 'shadow-sm' : ''} ${!completedSteps.config ? 'opacity-50 pointer-events-none' : ''}`}>
          <button onClick={() => completedSteps.config && toggleCard('options')} className="w-full flex items-center gap-2 p-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${completedSteps.options ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {completedSteps.options ? '✓' : stepNumber('options')}
            </div>
            <div className="flex-1 text-left font-semibold text-gray-700">Duration & Options</div>
            <div className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">{formatDuration()}</div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCard === 'options' ? 'rotate-180' : ''}`} viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          {openCard === 'options' && completedSteps.config && (
            <div className="border-t p-3">
              <div className="mb-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Duration</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center"><div className="text-[9px] text-gray-400">Hrs</div><input type="number" value={duration.hours} onChange={(e) => updateDuration('hours', e.target.value)} disabled={mode === 'mock'} className={`w-full text-center text-xl font-mono p-2 rounded-lg border ${mode === 'mock' ? 'bg-gray-100 text-gray-400' : ''}`} /></div>
                  <div className="text-2xl text-gray-300 pb-5">:</div>
                  <div className="flex-1 text-center"><div className="text-[9px] text-gray-400">Mins</div><input type="number" value={duration.minutes} onChange={(e) => updateDuration('minutes', e.target.value)} disabled={mode === 'mock'} className={`w-full text-center text-xl font-mono p-2 rounded-lg border ${mode === 'mock' ? 'bg-gray-100 text-gray-400' : ''}`} /></div>
                  <div className="text-2xl text-gray-300 pb-5">:</div>
                  <div className="flex-1 text-center"><div className="text-[9px] text-gray-400">Secs</div><input type="number" value={duration.seconds} onChange={(e) => updateDuration('seconds', e.target.value)} disabled={mode === 'mock'} className={`w-full text-center text-xl font-mono p-2 rounded-lg border ${mode === 'mock' ? 'bg-gray-100 text-gray-400' : ''}`} /></div>
                </div>
                {mode === 'mock' && <div className="mt-2 p-2 bg-amber-50 rounded-lg text-center text-amber-700 text-xs flex items-center justify-center gap-1"><svg className="w-3 h-3" viewBox="0 0 16 16"><rect x="4" y="7" width="8" height="7" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>Mock Exam timer locked at 02:00:00 (2 hours)</div>}
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Options</div>
                <div className="space-y-2">
                  <label className="flex items-center justify-between py-2"><div><div className="font-medium text-sm text-gray-700">Shuffle Questions</div><div className="text-[10px] text-gray-400">Randomise question order</div></div><button onClick={() => setShuffleQuestions(!shuffleQuestions)} className={`w-9 h-5 rounded-full transition ${shuffleQuestions ? 'bg-green-600' : 'bg-gray-300'}`}><div className={`w-4 h-4 rounded-full bg-white shadow transform transition ${shuffleQuestions ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} /></button></label>
                  <label className="flex items-center justify-between py-2"><div><div className="font-medium text-sm text-gray-700">Shuffle Options</div><div className="text-[10px] text-gray-400">Randomise A/B/C/D order</div></div><button onClick={() => setShuffleOptions(!shuffleOptions)} className={`w-9 h-5 rounded-full transition ${shuffleOptions ? 'bg-green-600' : 'bg-gray-300'}`}><div className={`w-4 h-4 rounded-full bg-white shadow transform transition ${shuffleOptions ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} /></button></label>
                  <label className="flex items-center justify-between py-2"><div><div className={`font-medium text-sm ${mode === 'mock' ? 'text-gray-400' : 'text-gray-700'}`}>Show Explanations</div><div className="text-[10px] text-gray-400">Show answer explanations after each question</div></div><button onClick={() => mode !== 'mock' && setShowExplanations(!showExplanations)} className={`w-9 h-5 rounded-full transition ${showExplanations ? 'bg-green-600' : 'bg-gray-300'} ${mode === 'mock' ? 'opacity-50 cursor-not-allowed' : ''}`}><div className={`w-4 h-4 rounded-full bg-white shadow transform transition ${showExplanations ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} /></button></label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"><svg viewBox="0 0 347 140"><text x="10" y="26" fill="#fff" fontSize="13">E=mc²</text><text x="80" y="50" fill="#fff" fontSize="11">sin²θ+cos²θ=1</text><text x="205" y="22" fill="#fff" fontSize="12">PV=nRT</text></svg></div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Session Summary</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-white/50 text-[10px]">Exam</div><div className="font-bold">{examType}</div></div>
              <div><div className="text-white/50 text-[10px]">Mode</div><div className="font-bold">{modeLabel}</div></div>
              <div><div className="text-white/50 text-[10px]">Subjects</div><div className="font-bold">{selectedSubjects.length > 0 ? `${selectedSubjects.length} subject(s)` : '—'}</div></div>
              {availableSections.length > 1 && <div><div className="text-white/50 text-[10px]">Sections</div><div className="font-bold">{selectedSections.length > 0 ? selectedSections.join(', ') : '—'}</div></div>}
              <div><div className="text-white/50 text-[10px]">Topics/Subtopics</div><div className="font-bold">{selectedTopics.length + selectedSubtopics.length > 0 ? `${selectedTopics.length + selectedSubtopics.length} selected` : 'All'}</div></div>
              <div><div className="text-white/50 text-[10px]">Year</div><div className="font-bold text-amber-300">{year}</div></div>
              <div><div className="text-white/50 text-[10px]">Duration</div><div className="font-bold">{formatDuration()}</div></div>
            </div>
          </div>
        </div>

        {/* Post-CBT Rules */}
        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200">
          <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Post-CBT Results</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2"><span className="w-16 text-green-700 font-medium">Practice:</span><span className="text-gray-600">✅ Results + Answers + Explanations</span></div>
            <div className="flex items-center gap-2"><span className="w-16 text-blue-700 font-medium">Study:</span><span className="text-gray-600">✅ Results + Answers + Explanations</span></div>
            <div className="flex items-center gap-2"><span className="w-16 text-amber-700 font-medium">Mock Exam:</span><span className="text-gray-600">✅ Results only (no answers/explanations)</span></div>
          </div>
        </div>

        {/* Start Button */}
        <button onClick={handleStartExam} disabled={selectedSubjects.length === 0 || loading} className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-700 to-green-600 disabled:bg-gray-300 disabled:text-gray-500 transition flex items-center justify-center gap-2 shadow-lg">
          {loading ? <>⏳ Starting...</> : <><svg className="w-5 h-5" viewBox="0 0 20 20"><polygon points="5,3 17,10 5,17" fill="white"/></svg> Start Session</>}
        </button>
        {selectedSubjects.length === 0 && !loading && <div className="text-center text-amber-600 text-xs mt-1">Please select at least 1 subject to start</div>}
      </div>

      <BottomNav />
    </div>
  );
}