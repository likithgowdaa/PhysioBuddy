
  # Healthcare Web App Design

📌 PROJECT TITLE

PhysioBuddy: Computer Vision-Based Physiotherapy Monitoring System with Prescription and X-Ray Guided Exercise Analysis

📌 PROJECT OVERVIEW

PhysioBuddy is a web-based AI-powered physiotherapy assistant that helps patients perform rehabilitation exercises correctly at home using computer vision and real-time posture tracking.

The system provides:

Guided exercise sessions
Real-time posture correction
Performance tracking
Personalized recovery insights

It eliminates the need for constant physical supervision by physiotherapists.

📌 PROBLEM STATEMENT

Patients performing physiotherapy at home often:

Do exercises incorrectly
Lack real-time feedback
Lose motivation
Cannot track recovery progress properly

This leads to:

Slower recovery
Risk of injury
Ineffective treatment
📌 SOLUTION

PhysioBuddy solves this by:

Using AI + Pose Detection (MediaPipe/OpenCV)
Providing real-time posture feedback
Tracking accuracy, repetitions, and performance
Offering personalized insights and progress analytics
📌 CORE MODULES (BASED ON YOUR UI)
1. 🔐 Authentication System
User Login / Signup
Secure access to personal dashboard
2. 📊 Dashboard
Welcome message
Quick Actions:
Start Exercise
Upload Prescription
Upload X-Ray
View Progress
Daily Summary:
Exercises completed
Accuracy %
Total exercises
Recent activity tracking
3. 🔍 Exercise Search Module
Search exercises (e.g., Knee, Shoulder, Back)
Category filters:
Knee
Shoulder
Back
Recommended exercises displayed as cards
Each exercise includes:
Name
Difficulty level
Duration
4. 📄 Prescription Upload Module
Upload doctor prescriptions (PDF/JPG/PNG)
Used for personalized recommendations
Drag & drop + file browse
5. 🩻 X-Ray Upload Module
Upload X-ray images (JPG/PNG/DICOM)
Preview functionality
AI-based analysis (conceptual / extendable feature)
6. 🎥 Exercise Demo Module
Video demonstration before exercise
Instructions:
Correct posture guidance
Safety tips
Exercise details:
Target muscle
Duration
Recommended reps
7. 🧠 Live Exercise Monitoring (CORE FEATURE)
Real-time webcam feed
Pose detection using AI
Body skeleton tracking
Real-time audio + voice-based posture correction system

Features:

Body detection status
Posture validation
Rep counting
Accuracy calculation
Timer tracking

📌 ADDITIONAL FEATURE (ENHANCED AI FEEDBACK SYSTEM)
🔊 Real-Time Error Detection with Audio & Voice Assistance

The system not only tracks posture but also actively corrects the user in real-time using intelligent feedback mechanisms.

🎯 FUNCTIONALITY

When the system detects incorrect posture:

❌ Identifies deviation from correct exercise form
📊 Calculates error based on joint angles / pose landmarks
⚠️ Triggers instant feedback
🔔 ALERT SYSTEM
Sound Alert (Immediate Warning)
Short beep sound when incorrect posture is detected
Helps user instantly recognize a mistake without looking at screen
Voice Assistance (Guided Correction)
AI-generated voice instructions such as:
“Straighten your back”
“Raise your arm higher”
“Keep your knee aligned”
Provides clear, human-like guidance
🧠 SMART CORRECTION LOGIC
Uses pose estimation (MediaPipe) to track body joints
Compares:
Expected posture vs Current posture
If deviation exceeds threshold:
Trigger alert
Provide specific correction instruction
📢 FEEDBACK TYPES
✅ Correct posture → “Perfect Form”
⚠️ Minor mistake → Soft alert + suggestion
❌ Major mistake → Sound alert + voice correction

Controls:

Start Exercise
Pause
Reset
Finish Session

Feedback:

“Perfect Form” detection
Real-time corrections
8. 📈 Session Report Module

After exercise completion:

Total repetitions
Accuracy score
Incorrect posture count
Duration
Calories burned

Accuracy Breakdown:

Correct reps
Incorrect reps

AI Tips:

Posture improvement suggestions
Performance feedback
9. 📊 Progress Dashboard
Best accuracy
Total exercises
Streak tracking
Improvement percentage

Graphs:

Accuracy trend (line chart)
Exercises completed (bar chart)
Exercise distribution (pie chart)

Achievements:

Week Warrior
Perfect Form
Rising Star

Filter:

Weekly / Monthly view
📌 KEY FEATURES
✅ AI-based posture detection
✅ Real-time feedback system
✅ Exercise recommendation system
✅ Performance analytics dashboard
✅ Session-based reporting
✅ Medical data upload (Prescription & X-ray)
✅ Interactive UI/UX
✅ Gamification (streaks, achievements)
📌 TECHNOLOGIES USED

Frontend:

HTML, CSS, JavaScript
React (Vite setup)
Tailwind / ShadCN UI

Backend (possible/extendable):

Node.js / Python

AI / Computer Vision:

MediaPipe
OpenCV

Other:

Chart libraries (for graphs)
GitHub (version control)
📌 SYSTEM WORKFLOW
User logs in
Uploads prescription / selects exercise
Watches demo video
Starts live exercise session
Camera tracks body posture
System:
Counts reps
Calculates accuracy
Detects mistakes
Session ends → report generated
Progress updated in dashboard
📌 FUTURE ENHANCEMENTS
AI-based personalized exercise plans
Doctor dashboard integration
Mobile app version
Voice assistant guidance
Wearable device integration
Injury prediction system
📌 UNIQUE SELLING POINT (USP)
Real-time AI physiotherapy coach
Combines:
Computer Vision
Healthcare
Fitness tracking
Works without human supervision
📌 SHORT ONE-LINE DESCRIPTION (FOR PRESENTATION)

👉 “PhysioBuddy is an AI-powered physiotherapy assistant that uses real-time pose detection to guide, monitor, and improve patient recovery at home.”

THANK YOU!!!

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
