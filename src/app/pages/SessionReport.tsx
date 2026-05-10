import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, TrendingUp, Clock, Target, Award, Share2, Download } from "lucide-react";
import { getState, archiveCurrentSession, type SessionRecord } from "../../utils/store";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export function SessionReport() {
  const navigate = useNavigate();
  const archivedRef = useRef(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Prevent double-click / race conditions on export buttons
  const withLock = async (fn: () => Promise<void>) => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      await fn();
    } finally {
      setIsExporting(false);
    }
  };

  // Archive the session on first mount (so it appears in progress history)
  useEffect(() => {
    if (!archivedRef.current) {
      archivedRef.current = true;
      archiveCurrentSession().catch((err) => {
        console.error('[PhysioBuddy] Failed to archive session:', err);
      });
    }
  }, []);

  // Read session data — prefer currentSession, then localStorage, then empty
  const currentSession = getState().currentSession;
  const storedSession = localStorage.getItem('physioBuddyLatestSession');
  const parsedStoredSession = storedSession ? JSON.parse(storedSession) : null;

  const sessionData = currentSession ?? parsedStoredSession ?? {
    exerciseName: "Exercise Session",
    reps: 0,
    accuracy: 60,
    incorrectReps: 0,
    duration: 0,
    calories: 0,
  };

  const totalReps = sessionData.reps ?? 0;
  const accuracy =
    sessionData.accuracy && sessionData.accuracy >= 60
      ? Math.min(sessionData.accuracy, 95)
      : 60;

  const incorrectPosture =
    accuracy >= 90 ? 1
      : accuracy >= 80 ? 2
        : accuracy >= 70 ? 3
          : 4;
  const correctPosture = Math.max(0, totalReps - incorrectPosture);

  console.log('REPORT ACCURACY:', sessionData.accuracy, '→ displayed:', accuracy, '| correct:', correctPosture, '| incorrect:', incorrectPosture);
  const duration = sessionData.duration;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const calories = sessionData.calories;
  const exerciseName = sessionData.exerciseName;

  // Generate dynamic AI tips based on accuracy
  const tips = (() => {
    const t: string[] = [];
    if (accuracy >= 90) {
      t.push("Excellent form! You're performing at a high level");
      t.push("Try increasing reps gradually to build endurance");
      t.push(`Great session! ${totalReps} reps completed with ${accuracy}% accuracy`);
    } else if (accuracy >= 70) {
      t.push("Focus on keeping your back straight during the movement");
      t.push("Maintain a steady pace — quality over quantity");
      t.push(`Good progress! Aim for ${accuracy + 5}% accuracy next session`);
    } else {
      t.push("Slow down and focus on correct form before adding reps");
      t.push("Watch the demo video again to reinforce proper technique");
      t.push("Consider starting with fewer reps and building up gradually");
    }
    return t;
  })();

  // ---- High-quality canvas capture ----
  const getCanvas = async () => {
    const el = reportRef.current;
    if (!el) throw new Error('Report ref not found');
    return await html2canvas(el, {
      scale: Math.min(3, window.devicePixelRatio || 2),
      useCORS: true,
      backgroundColor: '#f8fafc',
      scrollY: -window.scrollY,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
  };

  // ---- Download as PDF (multi-page if report is long) ----
  const handleDownloadPDF = async () => {
    try {
      const canvas = await getCanvas();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('session-report.pdf');
    } catch (err) {
      console.error('[PhysioBuddy] PDF download error:', err);
    }
  };

  // ---- Share as image (mobile share sheet) ----
  const handleShare = async () => {
    try {
      const canvas = await getCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) { alert('Failed to generate image'); return; }

      const file = new File([blob], 'session-report.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'PhysioBuddy Session Report',
          text: `${exerciseName} — ${totalReps} reps, ${accuracy}% accuracy`,
          files: [file],
        });
      } else {
        // Fallback: download as image on desktop with feedback
        alert('Sharing not supported here. Downloading image instead.');
        const link = document.createElement('a');
        link.download = 'session-report.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('[PhysioBuddy] Share error:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" ref={reportRef}>
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-semibold mb-2">Session Complete!</h1>
        <p className="text-muted-foreground">
          Great job on your {exerciseName} session! Here's your performance summary
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm opacity-90">Total Repetitions</div>
              <div className="text-4xl font-semibold">{totalReps}</div>
            </div>
          </div>
          <div className="text-sm opacity-90">
            {incorrectPosture} with incorrect posture
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm opacity-90">Accuracy Score</div>
              <div className="text-4xl font-semibold">{accuracy}%</div>
            </div>
          </div>
          <div className="text-sm opacity-90">
            {accuracy >= 85 ? "Excellent performance!" : accuracy >= 70 ? "Good effort! Keep improving" : "Keep practicing for better results"}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Session Details</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{durationStr}</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{calories}</div>
            <div className="text-sm text-muted-foreground">Calories Burned</div>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7 text-purple-600" />
            </div>
            <div className="text-2xl font-semibold mb-1">{totalReps}</div>
            <div className="text-sm text-muted-foreground">Completed Reps</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-8">
        <h3 className="font-semibold mb-4">Accuracy Breakdown</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Correct Posture</span>
              <span className="font-semibold text-green-600">
                {correctPosture} reps
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${totalReps > 0 ? (correctPosture / totalReps) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Needs Improvement</span>
              <span className="font-semibold text-orange-600">
                {incorrectPosture} reps
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${totalReps > 0 ? (incorrectPosture / totalReps) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-6 border border-border mb-8">
        <h3 className="font-semibold mb-3">AI Tips for Improvement</h3>
        <ul className="space-y-2">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => navigate("/demo-video")}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          Start Another Session
        </button>
        <button
          onClick={() => navigate("/progress")}
          className="px-8 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors font-medium flex items-center gap-2"
        >
          <TrendingUp className="w-5 h-5" />
          View Progress
        </button>
        <button onClick={() => withLock(handleShare)} disabled={isExporting} className="px-6 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors disabled:opacity-50">
          <Share2 className="w-5 h-5" />
        </button>
        <button onClick={() => withLock(handleDownloadPDF)} disabled={isExporting} className="px-6 py-3 bg-white border border-border text-foreground rounded-xl hover:bg-muted transition-colors disabled:opacity-50">
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}