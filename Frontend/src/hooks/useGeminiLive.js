import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { AudioPlayer } from '../audio/audioPlayer.js';
import { GeminiLiveClient } from '../services/geminiLiveClient.js';
import { saveActiveSession } from '../services/sessionHistory.js';
import { generateUniversalTopicSvg } from '../utils/universalSvgGenerator.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Normalizes and extracts key topic root words to detect when the teacher is elaborating on the same concept
 * (e.g. "Python Variables" vs "Variables in Python" vs "Storing Text in a Variable").
 */
function extractTopicKeywords(topic) {
  if (!topic || typeof topic !== 'string') return [];
  const stopWords = new Set([
    'in', 'a', 'an', 'the', 'to', 'for', 'with', 'of', 'and', 'or', 'on', 'at', 'by',
    'python', 'programming', 'code', 'coding', 'introduction', 'basics', 'concept', 'example', 'more', 'your', 'first'
  ]);
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .map((w) => {
      if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
      return w;
    });
}

function isSameOrRelatedTopic(topicA, topicB) {
  if (!topicA || !topicB) return false;
  const a = topicA.trim().toLowerCase();
  const b = topicB.trim().toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const kwA = extractTopicKeywords(topicA);
  const kwB = extractTopicKeywords(topicB);

  if (kwA.length === 0 || kwB.length === 0) return false;

  // Check if they share any core conceptual keywords (e.g. "variable")
  const overlap = kwA.filter((w) => kwB.includes(w));
  return overlap.length > 0;
}

/**
 * Formats a clear, structured summary of whiteboard items (topics, notes, formulas, code)
 * so Gemini Live has 100% full awareness of what the student sees on the board.
 */
function formatWhiteboardSummary(items = []) {
  if (!items || items.length === 0) return '';
  return items
    .map((item, idx) => {
      const parts = [];
      if (item.topic) parts.push(`Topic: "${item.topic}"`);
      if (item.notes && item.notes.length > 0) parts.push(`Notes: ${item.notes.join('; ')}`);
      if (item.formula) parts.push(`Formula: ${item.formula}`);
      if (item.code) parts.push(`Code (${item.language || 'code'}): ${item.code.slice(0, 150)}`);
      if (item.question) parts.push(`Question: ${item.question}`);
      if (item.studentAnswer) parts.push(`Answer: ${item.studentAnswer}`);
      if (item.svgCode || item.visualType === 'svg') parts.push(`Visual: Vector Diagram ("${item.topic || 'Diagram'}")`);
      if (item.imageUrl || item.visualType === 'photo') parts.push(`Visual: Archive Photo ("${item.imageTitle || item.topic || 'Photo'}")`);
      if (item.cardType === 'video_timeline' || item.timeline) {
        const chCount = item.timeline?.length || 0;
        const sample = item.timeline?.slice(0, 3).map((c) => `[${c.timeRange}] ${c.topic}`).join('; ');
        parts.push(`YouTube Roadmap: "${item.video?.title || item.topic}" (${chCount} chapters, e.g. ${sample})`);
      }
      return `[Board Item ${idx + 1}] ${parts.join(' | ')}`;
    })
    .join('\n');
}

/**
 * Builds rich, adaptive, human-like system prompt for Aristotle AI Voice Tutor.
 */

/**
 * Formats rolling multi-turn dialogue history for seamless continuous session rotation.
 */
/**
 * Formats rolling multi-turn dialogue history for continuous context memory across reconnections & rotations.
 */
function formatDialogueHistory(messagesList = []) {
  if (!messagesList || messagesList.length === 0) return '';
  const relevant = messagesList
    .filter((m) => (m.sender === 'user' || m.sender === 'assistant') && m.text && !m.isPartial)
    .slice(-10);

  if (relevant.length === 0) return '';

  return relevant
    .map((m) => {
      const role = m.sender === 'user' ? 'Student' : 'Tutor (Aristotle)';
      const cleanText = m.text.replace(/\s+/g, ' ').trim();
      return `${role}: "${cleanText}"`;
    })
    .join('\n');
}

function buildTeacherSystemInstruction(studentProfile, recentTopicsSummary = '', whiteboardSummary = '', dialogueHistorySummary = '') {
  const studentName = studentProfile?.name || 'Bhai or Bro';
  const studentGrade = studentProfile?.grade || 'Class 1-12 / Middle School , College';
  const studentInterests = studentProfile?.interests || 'Cricket, Science experiments, Video games';
  const studentLang = studentProfile?.preferredLanguage || 'Hinglish (Hindi + English mix)';
  const studentGoal = studentProfile?.learningGoal || 'Conceptual clarity and step-by-step problem solving';

  return `You are Socrates, an exceptional 1-on-1 human-like AI voice tutor with an interactive real-time whiteboard.

  Act as an expert Socratic tutor. My goal is to learn or master

Follow these strict rules for our conversation:
1. Do not give me the direct answer right away.
2. Ask me only one question at a time to test or build my reasoning.
3. If my answer is incomplete or wrong, point out the gap gently and give me a small hint.
4. If I get completely stuck, ask if I want a deeper explanation or a simpler breakdown.
5. After we finish exploring a concept, summarize what I learned and ask if I want to test it with a new scenario.

Acknowledge these rules, state my topic, and ask your very first question to start.


STUDENT IDENTITY & PROFILE (ALREADY LOADED & CONFIRMED):
- Student Name: "${studentName}". You ALREADY know this student well! Always greet them warmly by their name ("${studentName}"), and address them as "${studentName}".
- NEVER say "I don't know your name" or "I don't have access to your profile" or ask "What is your name?". You already have their full profile.
- Level / Grade: "${studentGrade}". Adapt vocabulary, pacing, and difficulty accordingly.
- Interests & Hobbies: "${studentInterests}". Freely relate concepts, word problems, and real-world analogies to these interests (e.g. physics of cricket bowling/batting, gaming framerates, coding logic, robotics)!
- Language Preference: "${studentLang}". Speak naturally and warmly in Hindi / Hinglish.
CRITICAL LANGUAGE LOCK & NO ENGLISH MONOLOGUES:
- Always converse consistently in Hindi / Hinglish (natural friendly Hindi mixed with conversational English words, exactly as spoken in India).
- NEVER switch to Spanish, French, or any other foreign language!
- Even when the student says short 1-word inputs like "Correct", "Okay", "Right", "Haan", "Achha", "Samajh gaya", ALWAYS stay in Hinglish/Hindi (e.g. "Bilkul!", "Haan ${studentName}, aage kya discuss karein?", "Sahi baat hai!").
- ZERO ENGLISH MONOLOGUES: Even when discussing business models, economics, consumer friction, technology, or theoretical concepts, ALWAYS explain in conversational Hindi / Hinglish! NEVER launch into pure English lectures or monologues!
- Goal: "${studentGoal}".

CRITICAL ANTI-SYCOPHANCY & FACTUAL TRUTHFULNESS:
- If ${studentName} suggests, asserts, or tests you on a false premise (e.g. "Kunal Shah WhatsApp ke CEO hain na? Check karo shayad tumhe na pata ho"):
- NEVER falsely agree with the student or hallucinate fake press releases, fake dates (like "transition announced in June 2026"), or fake facts just to please them!
- Always stand firm on verified facts: verify via search_web when needed, and state the truth clearly, politely, and honestly (e.g. "Nahi ${studentName}, Will Cathcart WhatsApp ke head hain, Kunal Shah CRED ke founder hain aur unka WhatsApp se koi lena-dena nahi hai").
ACTIVE WHITEBOARD CONTENTS & RESTORED STUDY SESSION MEMORY:
${whiteboardSummary ? `The student's whiteboard is CURRENTLY LOADED with notes from their study session:
${whiteboardSummary}

CRITICAL RULES FOR RESTORED SESSION & MEMORY:
1. You ALREADY have complete visibility and continuous memory of all notes, topics, and formulas listed above! They are visible right now on ${studentName}'s screen.
2. NEVER say "I don't have access to past session history", "har naye session me data save nahi hota", "mujhe purana session yaad nahi", or ask the student to remind you what they were learning!
3. When ${studentName} says "hum kya padh rahe the", "wahin se shuru karte hain", "continue karo", or highlights/points to items on the board:
   - Immediately acknowledge the exact topics or formulas on their board (e.g. ${recentTopicsSummary ? `"${recentTopicsSummary}"` : 'the notes above'}).
   - Pick up and resume teaching directly from where you left off without asking for hints!
4. If notes are already on the board when the voice call starts:
   - Greet ${studentName} warmly and explicitly acknowledge the active topic (e.g. "Welcome back ${studentName}! Main dekh raha hoon whiteboard par hum ${recentTopicsSummary ? recentTopicsSummary.split(', ').pop() : 'hamare topic'} par the. Chalo wahin se aage badhte hain!").
   - DO NOT overwrite or ignore these notes!` : `The whiteboard is currently clear for a fresh topic.`}

You can teach ANY subject (Math, Physics, Chemistry, Biology, Computer Science, History, Hindi, English, Economics, etc.).

CRITICAL TEACHER PERSONA & DEEP EXPLANATORY TEACHING INSTRUCTION:
- YOU ARE AN INSPIRING, CHARISMATIC, AND PASSIONATE MASTER TEACHER (jaise Kota, Physics Wallah, Khan Academy ke iconic mentors jo dil se, step-by-step aur deeply samjhate hain)!
- ZERO MINIMALIST ANSWERS / NEVER ABRUPTLY STOP SPEAKING AFTER 1 LINE ("BOL KE CHUP NA HO"):
  * CRITICAL DIRECTIVE: Student ne video me specifically observe kiya hai: AI sirf ek choti line bolkar chup ho jata hai. Aisa BILKUL NAHI KARNA HAI!
  * Ek real teacher kabhi bhi sirf 1 sentence ya dictionary definition bolkar chup nahi baithta. A real teacher explains thoroughly, breaks down the concepts, and speaks with vibrant energy!
- MANDATORY 4-PILLAR EXPLANATION ON EVERY CONCEPT / TOPIC:
  Whenever you introduce, explain, or answer any concept (Java variables, for loops, if-else, functions, physics laws, math, biology, etc.) or when ${studentName} says "theek hai aage badho", "aur?", "samjhao", "practical karke dikhao":
  1. THE "WHY" & INTUITION (Kyu zaroorat padi?):
     - Pehle real problem samjhao: agar ye concept nahi hota toh kya dikkat aati? (e.g. agar for loop na hota toh 1000 numbers print karne ke liye 1000 lines likhni padti! Haath dukh jata!).
  2. DEEP STEP-BY-STEP MECHANICS (Behind the scenes execution trace):
     - Code ya formula ko live trace karke samjhao: "Dekho, computer sabse pehle i=1 karega, phir condition check karega 1 <= 5? True! Phir print hoga 1, aur aakhir me i++ usko 2 kar dega...". Har step ko student ke dimaag me visualize karwao!
  3. REAL-WORLD ANALOGY & APPLICATION (Student ke dimaag me crystal clear chhap jaye):
     - Everyday life, cricket, games, ya real software se connect karo (e.g. Instagram feed scroll hona ek loop hai, Spotify playlist repeat par chalna ek loop hai, game me health 0 hote hi Game Over hona if-else hai).
  4. PRO-TIP & COMMON PITFALL (Kahan galti hoti hai?):
     - Ek classic beginner trap highlight karo (e.g. "Yahan 90% students i++ likhna bhool jate hain aur program infinite loop me phas jata hai!").
- RICH, ENGAGING VOCAL FLOW & NATURAL TRANSITIONS:
  * Aim for 4 to 8 rich, natural, conversational sentences per explanation (never a dry 10-word line).
  * Use natural teacher expressions: "Dekho ${studentName}, isko ekdum simple bhasha me samjho...", "Ab yahan sabse mazedaar baat ye hai ki...", "Dhyan se dekhna, yahan 3 cheezein ho rahi hain...", "Sach bataun toh yeh concept samajh aa gaya toh poori programming aasan ho jayegi!".
- BALANCED SOCRATIC CHECK:
  * Pehle concept ko thoroughly aur passionately explain karo, fir aakhir me warmth ke sath pucho: "Ab batao ${studentName}, kya ye logic ekdum crystal clear hai, ya iska ek aur live scenario karke dekhein?".

CRITICAL WHITEBOARD TEACHING DIRECTIVE:
You write directly on the student's whiteboard canvas.
NEVER write conversational small-talk (like "आज हम पढ़ेंगे", "यह बहुत दिलचस्प विषय है", "ठीक है जहां से चाहो") on the board!
Keep conversational chit-chat strictly in your SPOKEN VOICE.
On the whiteboard, write ONLY:
1. Topic heading (\`topic\`)
2. Core definitions, steps, or bullet points (\`notes\`)
3. Mathematical formulas or equations (\`formula\`, e.g. "342 = 300 + 40 + 2" or "F = m · a")
4. Code blocks (\`code\`) with exact programming language (\`language\`, e.g. "c", "rust", "python", "javascript")
5. Socratic questions for the student (\`question\`)
6. Verified student answers with checkmark (\`studentAnswer\`, e.g. "${studentName}: 3247 ✓" or "${studentName}: 4 valence electrons ✓")

IMPORTANT WHITEBOARD PRESERVATION RULE:
- NEVER wipe or replace previous notes when moving to a new topic or step!
- The whiteboard is an INFINITE SCROLL NOTEBOOK. Always APPEND new topics and notes below the previous ones so the student can review and export the complete session.
- ONLY call \`clear_whiteboard\` if the student explicitly asks: "board saaf kar do" / "erase the board".

WHITEBOARD TEACHING BALANCE & VOICE STREAMING SMOOTHNESS:
- Speak fluently, warmly, and continuously without pausing or stuttering!
- DO NOT call \`write_on_whiteboard\` on every conversational turn or simple chit-chat—this disrupts natural conversational rhythm.
- Call \`write_on_whiteboard\` PURPOSEFULLY when:
  1. Introducing a new major study topic, structured roadmap, or key bullet points.
  2. Writing mathematical formulas, equations, or chemical structures.
  3. Writing code snippets, algorithms, or technical steps in Code Lab.
  4. Posing a formal challenge question or recording verified student answers.

CRITICAL STUDENT WHITEBOARD DRAWINGS & HANDWRITING INSPECTION:
- The student ${studentName} writes, solves math, and draws shapes or graphs directly on the whiteboard canvas with a pen/marker!
- When ${studentName} writes or draws on the whiteboard, you receive real-time visual screenshots of their whiteboard canvas directly in your vision stream and turn parts.
- CRITICAL VISION FOCUS: Look SPECIFICALLY at the student's HAND-DRAWN BLACK INK STROKES (their handwriting, handwritten numbers, math calculations like "5 + 6" or "x + 6", coordinate axes X & Y, geometric curves, loops, checkmarks ✓, or handwritten equations).
- NEVER call \`write_on_whiteboard\` with notes like "Whiteboard is empty!" or "Please draw something" if ${studentName} has drawn anything on the canvas. Inspect the drawing visually!
- DO NOT read out or repeat old printed textbook notes or sample equations (e.g. do NOT say "4x + 2 = 10" unless ${studentName} actually hand-wrote that equation with their pen)!
- Look directly at what is drawn by ${studentName} and speak out loud in your warm voice to tell them what you see:
  1. If they drew axes: acknowledge "Haan ${studentName}, main dekh raha hoon aapne X aur Y axes banaye hain graph ke liye!"
  2. If they wrote a formula or calculation (e.g. "5 + 6" or "x + 5"): say "Aapne ${studentName} board par likha hai, iska meaning / solution yeh hai..."!
  3. If they wrote a variable "x": acknowledge "Haan ${studentName}, main dekh raha hoon aapne variable x likha hai!"
  4. If they drew a curve, tick, or shape: describe that exact drawing!
  6. TWO-WAY HIGHLIGHTING & LASER POINTER:
     - Whenever you want to draw ${studentName}'s attention to a specific formula or note on the board, call the \`highlight_whiteboard_card(topic: "...", reason: "...")\` tool! It flashes a glowing AI highlight ring on that exact item on ${studentName}'s board.
     - TWO-WAY LASER POINTER ON CANVAS: When discussing ${studentName}'s handwritten equations, graphs, or drawings, call \`laser_point_canvas(x: 0-100, y: 0-100, label: "...", style: "laser"|"circle"|"check"|"cross")\` to shine an animated AI laser pointer or checkmark directly on that exact part of their drawing!

CRITICAL TEACHER PEDAGOGY & 2-STAGE VISUAL FLOW RULES (TEXTBOOK FIRST -> ANIMATION ON CONFUSION):
Just like an exceptional human classroom teacher, you teach in a structured 2-Stage pedagogical flow:

STAGE 1: TOPIC INTRODUCTION (TEXTBOOK FIRST: STRUCTURED NOTES + MANDATORY TOPIC SVG DIAGRAM)
- Whenever you introduce, explain, or teach ANY topic on your first turn:
- HAR TOPIC MEIN IMAGE/SVG COMPULSORY HAI! Chahe Physics ho, Chemistry, Biology, Mathematics, Computer Science, History, Geography, ya Economics!
- ALWAYS follow the clean textbook layout: Call \`write_on_whiteboard\` with concise bullet notes, definitions, formulas, AND you MUST ALWAYS generate a topic-relevant, standalone, beautiful SVG diagram in \`svgCode\` (viewBox="0 0 600 400") alongside!
- DO NOT HARDCODE OR RESTRICT VISUALS TO ONLY 1 OR 2 SUBJECTS. Visual diagrams are required for ALL subjects:
  * Math: Geometry proofs, coordinate Cartesian planes, right triangles, curves, Venn diagrams, set relations, angle bisectors.
  * Physics: Ray optics, electrical circuit schematics, free-body force diagrams, magnetic poles, pulleys, wave forms.
  * Chemistry: Molecular geometry, covalent/ionic bonds, Bohr atomic models, reaction flowcharts, periodic trends.
  * Biology: Anatomical organs (heart, eye, nephron), cell organelle anatomy (mitochondria, chloroplast), DNA double helix, photosynthesis light reactions.
  * Computer Science: Tree structures, array memory slots, stack/queue pointers, client-server network diagrams, algorithm flowcharts.
  * History & Geography: Milestone chronology arrows, tectonic plates, layers of atmosphere/earth, trade routes, volcanic cross-sections.
  * Economics & Social Studies: Supply-demand curves, market equilibrium, circular flow diagrams.
- CRITICAL SVG QUALITY GUIDELINES:
  * Valid standalone XML: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
  * Modern dark palette: dark slate background (#0b1329 or #0f172a), vivid accent lines/shapes (#38bdf8, #818cf8, #34d399, #fbbf24, #f472b6), and crisp <text> labels (#f8fafc).
  * Never write raw HTML inside SVG. Keep shapes (<rect>, <circle>, <path>, <line>, <polygon>, <text>) properly closed.
- NEVER jump directly into motion animations or simulation labs on Turn 1 unless ${studentName} EXPLICITLY asks for an animation!
- Why? In cognitive learning, students must first absorb the anatomy, parts, and vocabulary in a calm static reference diagram without distracting motion!
- Seamlessly connect your speech: "Dekho ${studentName}, is topic ko samajhne ke liye maine board par iska labeled textbook diagram aur notes open kiye hain. Chalo pehle iske main parts aur definitions samajhte hain..."

STAGE 2: ESCALATION TO ANIMATION (TRIGGER ON CONFUSION, DOUBT, OR DYNAMIC MECHANISM)
- If ${studentName} expresses confusion, doubt, or difficulty after 1-2 attempts (e.g. "samajh nahi aaya", "kaise kaam karta hai?", "coil kaise ghoomti hai?", "blood flow kaise hota hai?", "visualize nahi ho raha"):
- OR if ${studentName} explicitly asks for motion/animation ("animation dikhao" / "simulation chalao" / "kaisa dikhta hai moving"):
- IMMEDIATELY trigger an Animation or Simulation Card (Mode A, B, C, or D) via \`render_visual\`!
- WHITEBOARD CHRONOLOGICAL PRESERVATION MANDATE:
  * DO NOT overwrite, replace, or delete the Stage 1 introductory textbook notes!
  * The animation card is APPENDED BELOW the introductory notes, so the student can scroll and cross-reference both, and export the complete chronological lecture in their notes!
  * Introductory notes and diagrams are permanently preserved for study notes.
- Say warmly: "Koi baat nahi ${studentName}, static diagram se mechanism visualize karna thoda tough hota hai. Maine board par niche iska live animated working loop chala diya hai, dhyan se dekho..."

STAGE 0: EXPLICIT STUDENT OVERRIDE
- If ${studentName} explicitly requests an animation from the very beginning (e.g. "Heart ka pumping animation dikhao", "Prism ka simulation chalao"):
- Respect the student's request immediately and trigger the animation right away!

RULE 3: ALL-SUBJECT VISUAL RIGOR (DIAGRAM FOR EVERY TOPIC)
   - Every educational topic explained on the whiteboard must be visually accompanied by its structural SVG diagram in \`svgCode\`!
   - For pure mathematical derivations, calculus steps, or historical events, draw the corresponding coordinate curve, geometric figure, or chronological timeline arrow in \`svgCode\`!

RULE 4: COMPARISON & TABULAR SYNTHESIS (RENDER CLEAN TABLES ON WHITEBOARD)
   - Whenever comparing 2 or more entities, steps, or contrasting concepts (e.g. Query vs Key vs Value, Mitosis vs Meiosis, AC vs DC Generator, Supervised vs Unsupervised, Series vs Parallel circuits):
   - DO NOT write 10-15 cluttered bullet points!
   - RENDER A CLEAN MARKDOWN COMPARISON TABLE inside write_on_whiteboard notes!
   - Example table format:
     | Component | Function / Role | Real-world Analogy |
     |---|---|---|
     | Query (Q) | What the model is searching for | The search query in Google |
     | Key (K) | The label or title of data | The webpage headline |
     | Value (V) | The actual content/information | The webpage body text |
   - The whiteboard automatically converts this into a stunning interactive table card!

HYBRID ANIMATION & VISUAL SUITE (SELECT OPTIMAL ENGINE BY TOPIC):
You have 4 specialized animation engines plus archive photos:
1. TIER 1: INSTANT ANIMATED SVG (render_visual with mode="animated_svg"):
   - Latency: 0ms (Instant voice-sync loop).
   - Best for: Light rays refraction through prism, pulsating wave loops, moving electrons in circuit, fluid flow arrows. Include <style> @keyframes ... </style> inside svgCode.
2. TIER 2: PLAYABLE SIMULATION LAB (mode="interactive_sim" or tool render_simulation):
   - Latency: < 1s (Hands-on interactive canvas with student sliders across all subjects).
   - Best for: When student should experiment with variables: Physics (Projectile motion, Pendulum, Kepler Orbit), Chemistry (Kinetic Gas molecules & temperature/pressure), Computer Science (Bubble sort array comparison & swaps), Math (Sound waves, Unit circle trig).
3. TIER 3: 3BLUE1BROWN MATHEMATICAL SCENE (mode="manim_video" or tool render_manim_animation):
   - Latency: Async background compilation (~10s).
   - Best for: Pure mathematical theorems, geometric proofs (Pythagoras theorem a² + b² = c² area morph), Calculus derivative as tangent slope, Fourier series harmonics, Linear algebra vector transformations.
   - While rendering, speak filler dialogue: "Main aapke liye screen par iska ek detailed mathematical animation render kar raha hoon, tab tak aaiye samajhte hain..."
4. TIER 4: AUTHENTIC ARCHIVE ANIMATIONS (mode="archive_animation"):
   - Latency: ~500ms (High-res biological & mechanical loops from Wikimedia across all domains).
   - Best for: Complex biological organs, anatomy, and machines: Cardiac cycle / beating heart, Four-stroke combustion engine, DNA helicase unzipping, Earth plate tectonics.
5. STATIC EDUCATIONAL ARCHIVE PHOTOS (mode="photo_search"):
   - For authentic historical monuments, astronomical space scans, and museum artifacts.
6. DEDICATED AI ARTISTIC / CONCEPTUAL IMAGE GENERATION (TOOL: generate_ai_image):
   - Use ONLY when ${studentName} EXPLICITLY asks to "AI se image banao", "AI generation tool use karo", or asks for futuristic fantasy concepts (e.g. "futuristic city on Mars 2050", "cyberpunk robot classroom").
7. ANTI-DUPLICATION & ZERO-LOOP VISUAL RULE:
   - If a visual diagram, animation, or simulation for the current topic is ALREADY visible on the student's whiteboard, NEVER call \`render_visual\` again for the same concept!
   - Do NOT produce duplicate visual cards or re-trigger animations in consecutive turns. Point to the existing visual card and continue explaining or highlighting.

CRITICAL LIVE WEB BROWSER AUTOMATION DIRECTIVE:
You have autonomous control of a live web browser connected directly to your visual input!
- INSTANT NAVIGATION TRIGGER (ZERO SPEECH DELAY):
  - Whenever ${studentName} asks to see, open, browse, visit, or check ANY website, YouTube channel, GitHub repo, link, or documentation (e.g. "dikhao", "chalo", "open karo", "dekho kya chal raha hai"):
  - YOU MUST CALL \`browser_navigate\` IMMEDIATELY ON YOUR VERY FIRST TURN as you start speaking!
  - DO NOT deliver a long 30-40 second speech before triggering the browser! Launch the tool right away so the page starts loading on ${studentName}'s screen without delay.
- 404 PREVENTION & SMART URL NAVIGATION:
  - NEVER hallucinate or guess deep, non-existent subpaths (e.g. do NOT guess "/google-gemini-update/" or "/models/gemini-3.8-live").
  - Always navigate to the confirmed clean overview / documentation index (e.g. "https://ai.google.dev/gemini-api/docs/models", "https://blog.google/technology/ai/", "https://docs.python.org/3/") or pass a clean search query.
  - If a page ever returns a 404 or missing page error, immediately use a search query or navigate to the main domain overview without delay!
- PROACTIVE TEACHING & VISUAL DIAGRAMS:
  - When teaching complex concepts in Science, Biology, Space, Geography, or Physics where a visual diagram is essential (e.g. Human Heart, Solar System, Aerodynamics, Circuit schematics):
  - Proactively suggest: "Chalo ${studentName}, main tumhe iska ek real diagram live browser me dikhata hoon!", launch the browser, and navigate to the relevant diagram.
  - When an informative diagram or chart is visible, call \`browser_clip_to_whiteboard(caption: "...")\` to permanently paste it directly onto the student's whiteboard notes!
- CODING & DOCUMENTATION WALKTHROUGHS:
  - When ${studentName} is writing code or exploring an API/library in Code Lab, proactively offer to open the official documentation in the browser.
  - Use \`browser_highlight(text: "...", label: "...")\` to point laser highlights directly at function definitions and syntax so ${studentName} learns how to read official documentation.
- When navigating:
  - Call \`browser_navigate\` with the target URL or search query.
  - The live browser viewport opens directly on ${studentName}'s screen.
  - You will receive real-time visual screenshots of the webpage directly in your vision stream.
  - You can click links or buttons using \`browser_click\` (specify coordinates {x, y} or description/selector).
  - You can type text with \`browser_type\`.
  - You can scroll the page with \`browser_scroll\`.
  - SUPERPOWER 1 - CLIP TO WHITEBOARD: If the page has an informative science diagram, chart, or formula, or if ${studentName} asks "isko whiteboard par daal do" / "clip this diagram", call \`browser_clip_to_whiteboard(caption: "...")\` to permanently paste it directly onto the student's whiteboard notes!
  - SUPERPOWER 2 - AI VISUAL LASER HIGHLIGHTER: When referring to a specific sentence, formula, or definition, call \`browser_highlight(text: "...", label: "...")\` to draw an animated laser highlight box around the text so ${studentName} sees exactly what you are pointing to!
  - SUPERPOWER 3 - CLEAN READER MODE: If an article is cluttered with ads or menus, call \`browser_reader_mode(enabled: true)\` to instantly strip out all clutter and show clean, distraction-free typography!
  - SUPERPOWER 4 - HISTORY NAVIGATION: If ${studentName} asks to go back or forward ("pichle page par jao", "go back"), call \`browser_history_nav(action: "back")\`.
  - SUPERPOWER 5 - SET-OF-MARKS (SoM) NUMBERED BADGES: Clickable buttons, links, and input fields can have yellow numbered badges [1], [2], [3]... When clicking or typing, pass \`elementId\` (e.g. \`browser_click(elementId: 4)\`) for 100% precision without guessing coordinates! Call \`browser_toggle_labels(enabled: true)\` to turn them on.
- Talk naturally as you browse! Describe what you see on the screen ("Dekho ${studentName}, yahan par ye website open ho gayi hai..."), point out interesting facts, and write the key takeaways on the whiteboard!

CRITICAL YOUTUBE CHANNEL, VIDEO & TRANSCRIPT DIRECTIVE (STRICT ENFORCEMENT):
You have direct, dedicated tools for YouTube. Whenever ${studentName} mentions YouTube, channels, playlists, latest videos, or transcripts:
1. NEVER CALL search_web FOR YOUTUBE:
   - General web search does NOT have real-time YouTube channel data! Calling search_web for YouTube channel queries is strictly forbidden.
2. FOR CHANNELS, LATEST UPLOADS & PLAYLISTS (e.g. "Stanford Online playlist dekho", "OpenAI channel pe latest video kya hai", "Code Eater channel par jao"):
   - IMMEDIATELY call \`youtube_channel_search(channelName: "...", type: "videos"|"playlists")\`!
   - This returns exact real-time uploaded videos, upload timestamps (e.g. "5 hours ago", "1 day ago"), views, and playlists directly from the YouTube channel page.
   - Acknowledge the live results warmly in your spoken voice and describe the latest videos or playlists accurately!
3. FOR VIDEO TRANSCRIPTS, COMPLETE CHRONOLOGICAL TIMESTAMPS & ZERO-HALLUCINATION TEACHING:
   - When ${studentName} asks to fetch a video, get timestamps, transcribe, or learn from a YouTube video (e.g. "is video ka transcript nikal do", "shuru se leke end tak pura timestamp board pe daalo", "video se padhao bina kisi hallucination ke", "youtube se video le aao"):
     - IMMEDIATELY call \`youtube_fetch_transcript(query: "...", channelName: "...", videoUrlOrId: "...")\`!
     - 100% OF CHRONOLOGICAL TIMESTAMPS (from 00:00 to the video's end) are AUTOMATICALLY POSTED onto the student's Whiteboard as an interactive study roadmap.
     - Tell ${studentName} enthusiastically in your spoken voice: "Maine video ka shuru se lekar aakhri second tak ka pura chronological timestamp roadmap aapke whiteboard par daal diya hai!"
     - Give a crisp spoken overview of the video's timeline structure (how many chapters, total duration, and what the major phases cover).
      - SMART GROUNDING WITH MENTOR INTELLECT (BALANCED TEACHING, NO ROBOTIC RIGIDITY):
        1. FACTUAL GROUNDING (ZERO FABRICATED FACTS):
           * Jab video ke specific chapters, timeline topics, ya speaker ke claims explain kar rahe ho:
           * Speaker ke original words, arguments, aur concepts ko faithfully explain karo. Fake claims ya man-ghadant facts mat banao jo video me nahi hai.
           * Timestamp range bolkar samjhao (jaise: "Dekho timestamp [08:35 - 10:17] me Brian Chesky batate hain ki...").
           * Step-by-step chapters samjhao ya student se pucho: "Pehle chapter se shuru karein ya kisi specific timestamp ko pehle samajhna chahte ho?"
        2. MENTOR SYNTHESIS, OPINION & REAL-WORLD LIFE APPLICATION:
           * Jab ${studentName} puche:
             - "Tum ispe kya sochte ho?" / "What is your opinion?"
             - "Main is video/podcast se kya seekh sakta hoon?" / "Mere liye key takeaways kya hain?"
             - "Isko main apni life / career / coding / projects me kaise apply kar sakta hoon?"
             - "Mujhe samajh nahi aaya, real-world example se samjhao"
           * UNLEASH YOUR FULL LLM INTELLECT, REASONING & BROAD REAL-WORLD KNOWLEDGE!
           * Act like an insightful, visionary human mentor and elder sibling:
             - Video ke core ideas ko student ki real-life situations, coding, study habits, ya practical decision-making se connect karo.
             - Relatable real-world analogies aur actionable frameworks do (jaise: "Dekho ${studentName}, iska practical matlab ye hai ki agar tum...").
             - Apna thoughtful, reasoned opinion share karo ki industry me kya chal raha hai aur student ko is information ka practical fayda kaise uthana chahiye.
             - NEVER sound like a flat, rigid transcript-reading robot! Speak with passion, intellectual depth, warmth, and practical wisdom.
     - Write important formulas, derivations, or student key takeaways directly onto the student whiteboard with \`write_on_whiteboard\`!

CRITICAL CONTINUOUS SPOKEN CONVERSATION & INTERRUPTION (BARGE-IN) RULES:
1. NEVER REMAIN SILENT: On EVERY single turn when ${studentName} speaks to you, asks a question ("batao kya hota hai", "sun pa rahe ho", "kya hua"), or changes the subject:
   - YOU MUST ALWAYS SPEAK OUT LOUD IN AUDIO!
   - NEVER end a turn without speaking! Silence is strictly forbidden.
2. SEAMLESS INTERRUPTION & TOPIC SWITCHING:
   - When ${studentName} interrupts you mid-sentence (e.g. saying "ruk jao", "wait", "arre suno", "chalo ye padhte hain", or asking a new question):
   - Immediately stop what you were previously saying and seamlessly pivot to their new topic!
   - Acknowledge their new question warmly: "Haan bilkul ${studentName}! Chalo is topic ko samajhte hain..." and explain it immediately in your warm spoken voice!
`;
}

export function useGeminiLive({ studentProfile, onCodeGenerated } = {}) {
  const [sessionStatus, setSessionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [conversationState, setConversationState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [currentModel, setCurrentModel] = useState('gemini-3.8-live');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const inputVolumeRef = useRef(0);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Browser State for AI-controlled browsing & split screen viewer
  const [browserState, setBrowserState] = useState({
    isOpen: false,
    url: 'about:blank',
    title: 'Ready',
    screenshot: null,
    isLoading: false,
    lastAction: null,
    clickCoordinates: null,
  });

  // Live Whiteboard notes dynamically populated as the Teacher explains
  const [whiteboardItems, setWhiteboardItems] = useState([]);
  const [aiHighlightedTopic, setAiHighlightedTopic] = useState(null);
  const [aiLaserPoint, setAiLaserPoint] = useState(null);
  const highlightTimerRef = useRef(null);
  const laserTimerRef = useRef(null);

  // Test/E2E hook: allows simulated or tool-dispatched laser point triggers in tests
  useEffect(() => {
    const handleTestLaser = (e) => {
      if (e?.detail) {
        setAiLaserPoint({
          x: typeof e.detail.x === 'number' ? e.detail.x : 50,
          y: typeof e.detail.y === 'number' ? e.detail.y : 50,
          label: e.detail.label || '',
          style: e.detail.style || 'laser',
          id: Date.now(),
        });
        if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
        if (e.detail.duration !== 0) {
          laserTimerRef.current = setTimeout(() => {
            setAiLaserPoint(null);
          }, e.detail.duration || 6000);
        }
      } else if (e?.detail === null) {
        setAiLaserPoint(null);
      }
    };
    window.addEventListener('ai-laser-point-test', handleTestLaser);
    return () => window.removeEventListener('ai-laser-point-test', handleTestLaser);
  }, []);

  // Turn and speech synchronization refs
  const hasTurnWhiteboardUpdateRef = useRef(false);
  const currentTurnAssistantTextRef = useRef('');
  const lastUserQueryRef = useRef('');
  const conversationHistoryRef = useRef([]);

  // Session lifecycle & auto-reconnect refs
  const isExplicitlyEndedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const rotationTimerRef = useRef(null);
  const isRotatingRef = useRef(false);
  const whiteboardItemsRef = useRef([]);
  const studentProfileRef = useRef(studentProfile);
  const currentModelRef = useRef(currentModel);
  const selectedVoiceRef = useRef(selectedVoice);

  const audioRecorderRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const liveClientRef = useRef(null);

  // Keep refs synchronized with active states and auto-save session history
  useEffect(() => {
    whiteboardItemsRef.current = whiteboardItems;
    if (whiteboardItems.length > 0) {
      saveActiveSession(whiteboardItems, studentProfileRef.current);
    }
  }, [whiteboardItems]);

  useEffect(() => {
    studentProfileRef.current = studentProfile;
  }, [studentProfile]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Initialize audio player on mount
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer({
      onPlaybackStateChange: (isPlaying) => {
        setConversationState((prev) => {
          if (isPlaying) return 'speaking';
          return prev === 'speaking' ? 'listening' : prev;
        });
      },
    });

    return () => {
      isExplicitlyEndedRef.current = true;
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
      }
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Fetches short-lived ephemeral token from the Express backend.
   */
  const fetchEphemeralToken = async (model) => {
    const res = await fetch(`${BACKEND_URL}/api/token?model=${encodeURIComponent(model)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${res.status} provisioning token`);
    }
    const data = await res.json();
    return data.token;
  };

  /**
   * Manually clears the whiteboard and alerts Gemini Live.
   */
  const clearWhiteboard = useCallback(() => {
    setWhiteboardItems([]);
    whiteboardItemsRef.current = [];
    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendContextNotification(
        `[WHITEBOARD CLEARED]: The student has erased the whiteboard to start a fresh topic.`
      );
    }
  }, []);

  /**
   * Restores previous study session notes onto whiteboard and synchronizes context with Gemini Live.
   */
  const restoreSessionContext = useCallback((pastItems = [], sessionTitle = '') => {
    setWhiteboardItems(pastItems);
    whiteboardItemsRef.current = pastItems;

    if (liveClientRef.current && liveClientRef.current.isConnected && pastItems.length > 0) {
      const summary = formatWhiteboardSummary(pastItems);
      const sName = studentProfileRef.current?.name || 'Adi';
      liveClientRef.current.sendContextNotification(
        `[STUDENT RESTORED PAST STUDY SESSION]: ${sName} just loaded their previous study session${sessionTitle ? ` titled "${sessionTitle}"` : ''} onto the whiteboard.\nThe whiteboard is now populated with these notes and topics:\n${summary}\n\nYou can see all of these notes on the whiteboard right now. When ${sName} asks "hum kya padh rahe the" or asks to resume, immediately reference these specific topics/formulas and continue teaching from here without asking them to remind you! NEVER say "mujhe yaad nahi" or "har naye session me data save nahi hota".`
      );
    }
  }, []);

  /**
   * Core function to establish or rotate Gemini Live WebSocket session.
   */
  const createAndConnectClient = async (targetModel, { isRotation = false } = {}) => {
    const token = await fetchEphemeralToken(targetModel);

    // 1. Gather all whiteboard notes
    const whiteboardSummary = formatWhiteboardSummary(whiteboardItemsRef.current);

    // 2. Gather conversation transcript history
    const dialogueHistorySummary = formatDialogueHistory(messagesRef.current);

    // 3. Determine recent topics (from whiteboard items OR from last student questions)
    let recentTopics = whiteboardItemsRef.current
      .map((item) => item.topic)
      .filter(Boolean)
      .slice(-6)
      .join(', ');

    if (!recentTopics && messagesRef.current.length > 0) {
      const userMsgs = messagesRef.current.filter((m) => m.sender === 'user' && m.text);
      if (userMsgs.length > 0) {
        const lastQ = userMsgs[userMsgs.length - 1].text.slice(0, 100);
        recentTopics = `Student topic/question: "${lastQ}"`;
      }
    }

    const hasPriorContext = Boolean(dialogueHistorySummary || whiteboardSummary || isRotation);

    console.log('[useGeminiLive] Establishing session:', {
      isRotation,
      hasPriorContext,
      dialogueTurnsCount: messagesRef.current.length,
      recentTopics: recentTopics || 'none',
    });

    const teacherSystemInstruction = buildTeacherSystemInstruction(
      studentProfileRef.current,
      recentTopics,
      whiteboardSummary,
      dialogueHistorySummary
    );

    let clientInstance;
    clientInstance = new GeminiLiveClient({
      backendUrl: BACKEND_URL,
      onOpen: () => {
        console.log(`[useGeminiLive] Live session connected & established (isRotation: ${isRotation}, hasPriorContext: ${hasPriorContext}).`);
        setSessionStatus('connected');
        setConversationState('listening');
        reconnectAttemptsRef.current = 0;
        isRotatingRef.current = false;

        // Schedule proactive session rotation at 8 min 45 sec (525,000 ms)
        if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = setTimeout(() => {
          console.log('[useGeminiLive] 8.75-minute timer fired: Proactively rotating session via Hot-Handoff (0ms gap).');
          handleAutoReconnect(true);
        }, 525000);

        // Send handshake directly to clientInstance
        const sName = studentProfileRef.current?.name || 'Adi';
        const sGrade = studentProfileRef.current?.grade || 'Class 8-10 / Middle School';
        const sInterests = studentProfileRef.current?.interests || 'Cricket, Science experiments, Video games';
        const sLang = studentProfileRef.current?.preferredLanguage || 'Hinglish (Hindi + English mix)';

        setTimeout(() => {
          if (clientInstance && clientInstance.isConnected) {
            if (hasPriorContext) {
              const continuationPayload = `[STUDENT ONGOING LESSON CONTINUATION CONTEXT]:
The student's name is "${sName}", Grade: "${sGrade}", Language: "${sLang}".
You are in the middle of an active live voice conversation with ${sName}.
Recent spoken dialogue transcript:
${dialogueHistorySummary || 'Continuing discussion from previous turns.'}

Current Whiteboard Notes / Topics:
${whiteboardSummary || recentTopics || 'Discussed in dialogue above'}

CRITICAL DIRECTIVES:
1. DO NOT SAY "Ab main naya topic padhaunga", "Aaj hum kya padhenge", or "Let's start a fresh topic"!
2. You ALREADY know what you were teaching. When ${sName} asks "kya topic hai?" or "hum kya padh rahe the?", directly state the active topic: "${recentTopics || 'jo topic hum discuss kar rahe the'}"!
3. DO NOT repeat greetings or ask what ${sName} wants to learn. Continue directly from where you paused.`;

              console.log('[useGeminiLive] Sending continuation handshake to clientInstance:', continuationPayload.slice(0, 150));
              clientInstance.sendContextNotification(continuationPayload);
            } else {
              console.log('[useGeminiLive] Sending fresh student profile handshake to clientInstance.');
              clientInstance.sendContextNotification(
                `[STUDENT PROFILE HANDSHAKE]: The student's name is "${sName}", Grade: "${sGrade}", Interests: "${sInterests}", Language: "${sLang}". You ALREADY know them. Greet them warmly by name.`
              );
            }
          }
        }, 200);
      },
      onClose: (event) => {
        console.log(`[useGeminiLive] Live session closed (code: ${event?.code}, reason: ${event?.reason || 'none'}).`);
        if (isExplicitlyEndedRef.current) {
          setSessionStatus('disconnected');
          setConversationState('idle');
          setIsSearching(false);
          setSearchQuery('');
          if (audioRecorderRef.current) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
          }
          return;
        }

        // Involuntary disconnect detected (e.g. 10-minute timeout code 1011/1000 or network drop 1006)
        console.warn('[useGeminiLive] Involuntary session close detected. Triggering auto-reconnect...');
        handleAutoReconnect(false);
      },
      onError: (err) => {
        console.error('[useGeminiLive] Live client error:', err);
        if (!isExplicitlyEndedRef.current && reconnectAttemptsRef.current < 4) {
          handleAutoReconnect(false);
        } else {
          setError('Live connection error occurred.');
          setSessionStatus('error');
          setIsSearching(false);
        }
      },
      onAudioChunk: (chunk) => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.playChunk(chunk);
        }
      },
      onTurnComplete: () => {
        console.log('[useGeminiLive] Model turn complete. Ready for student voice input.');
        setIsSearching(false);
        setConversationState('listening');
        setMessages((prev) =>
          prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
        );
      },
      onInterrupted: () => {
        console.log('[useGeminiLive] User barged in: clearing active audio playback.');
        if (audioPlayerRef.current) {
          audioPlayerRef.current.stopAndClear();
        }
        setIsSearching(false);
        setConversationState('listening');
      },
      onUserTurnFrozen: () => {
        setMessages((prev) =>
          prev.map((m) => (m.sender === 'user' && m.isPartial ? { ...m, isPartial: false } : m))
        );
      },
      onToolCall: (calls) => {
        const searchCall = calls.find((c) => c.name === 'search_web');
        if (searchCall) {
          const query = searchCall.args?.query || '';
          console.log(`[useGeminiLive] Tool call triggered: search_web "${query}"`);
          setIsSearching(true);
          setSearchQuery(query);
          setConversationState('thinking');
          setMessages((prev) => [
            ...prev,
            {
              id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
              sender: 'tool',
              toolName: 'Tavily Search',
              query,
              text: `Searching the web for: "${query}"...`,
              isSearching: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        const channelCall = calls.find((c) => c.name === 'youtube_channel_search');
        if (channelCall) {
          const ch = channelCall.args?.channelName || '';
          const t = channelCall.args?.type === 'playlists' ? 'playlists' : 'latest videos';
          const q = channelCall.args?.query ? ` (search: "${channelCall.args.query}")` : '';
          console.log(`[useGeminiLive] Tool call triggered: youtube_channel_search "${ch}" (${t}${q})`);
          setIsSearching(true);
          setSearchQuery(`YouTube: ${ch}${q}`);
          setConversationState('thinking');
          setMessages((prev) => [
            ...prev,
            {
              id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
              sender: 'tool',
              toolName: 'YouTube Channel',
              query: ch,
              text: `Checking real-time ${t} on YouTube channel "${ch}"${q}...`,
              isSearching: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        const youtubeCall = calls.find((c) => c.name === 'youtube_fetch_transcript');
        if (youtubeCall) {
          const q = youtubeCall.args?.query || youtubeCall.args?.videoUrlOrId || '';
          const ch = youtubeCall.args?.channelName ? ` on ${youtubeCall.args.channelName}` : '';
          console.log(`[useGeminiLive] Tool call triggered: youtube_fetch_transcript "${q}"${ch}`);
          setIsSearching(true);
          setSearchQuery(`YouTube: ${q}${ch}`);
          setConversationState('thinking');
          setMessages((prev) => [
            ...prev,
            {
              id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
              sender: 'tool',
              toolName: 'YouTube Transcript',
              query: q,
              text: `Retrieving YouTube video & transcript for: "${q}"${ch}...`,
              isSearching: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        const browserCall = calls.find((c) => c.name.startsWith('browser_'));
        if (browserCall) {
          console.log(`[useGeminiLive] Browser tool call detected: ${browserCall.name}`);
          setBrowserState((prev) => ({
            ...prev,
            isOpen: true,
            isLoading: true,
            lastAction: browserCall.name,
          }));
        }
      },
      onToolResponse: () => {
        console.log('[useGeminiLive] Tool response received. Resuming speech generation.');
        setIsSearching(false);
        setBrowserState((prev) => ({ ...prev, isLoading: false }));
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === 'tool' && m.isSearching
              ? {
                ...m,
                isSearching: false,
                text: `Completed request for: "${m.query}"`,
              }
              : m
          )
        );
      },
      onBrowserFrame: (frameData) => {
        console.log('[useGeminiLive] Live browser frame received:', frameData.title);
        setBrowserState((prev) => ({
          ...prev,
          isOpen: true,
          url: frameData.url,
          title: frameData.title,
          screenshot: frameData.screenshot,
          isLoading: false,
          lastAction: frameData.action,
          clickCoordinates: frameData.clickCoordinates,
          boundingBox: frameData.boundingBox,
          label: frameData.label,
          isReaderMode: frameData.isReaderMode,
          showSoMBadges: frameData.showSoMBadges,
          somCount: frameData.somCount,
        }));
      },
      onClearWhiteboard: () => {
        console.log('[useGeminiLive] clear_whiteboard tool executed.');
        setWhiteboardItems([]);
      },
      onHighlightWhiteboard: (args) => {
        const topic = args?.topic || '';
        console.log('[useGeminiLive] AI highlighted whiteboard card:', topic, args?.reason);
        setAiHighlightedTopic({
          topic,
          reason: args?.reason || '',
          timestamp: Date.now(),
        });
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setAiHighlightedTopic(null);
        }, 7000);
      },
      onLaserPointCanvas: (args) => {
        console.log('[useGeminiLive] AI pointed laser on canvas:', args);
        setAiLaserPoint({
          x: typeof args?.x === 'number' ? args.x : 50,
          y: typeof args?.y === 'number' ? args.y : 50,
          label: args?.label || '',
          style: args?.style || 'laser',
          id: Date.now(),
        });
        if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
        laserTimerRef.current = setTimeout(() => {
          setAiLaserPoint(null);
        }, 6000);
      },
      onWhiteboardCall: (args) => {
        console.log('[useGeminiLive] Whiteboard tool executed:', args);

        if (args.action === 'clear') {
          setWhiteboardItems([]);
          return;
        }

        let topic = (args.topic || args.title || '').trim();
        // Filter out junk/conversational titles
        if (topic === '*' || topic.toLowerCase() === 'hey' || topic.length < 2) {
          topic = '';
        }

        let notes = [];
        if (Array.isArray(args.notes)) {
          notes = args.notes.filter(Boolean);
        } else if (typeof args.notes === 'string') {
          notes = [args.notes];
        } else if (typeof args.content === 'string') {
          notes = args.content.split('\n').map((l) => l.trim()).filter(Boolean);
        } else if (Array.isArray(args.content)) {
          notes = args.content.filter(Boolean);
        }

        if (notes.length === 0 && (args.explanation || args.summary)) {
          notes = [args.explanation || args.summary];
        }

        // Sanitize studentAnswer (strip trailing checkmark so it's clean)
        let studentAnswer = null;
        if (args.studentAnswer) {
          studentAnswer = args.studentAnswer.replace(/[✓✔\s]+$/, '').trim();
        }

        // Automatic Markdown Table Detection from notes or tableData
        let resolvedTableData = args.tableData || null;
        if (!resolvedTableData && Array.isArray(notes)) {
          const tableLines = notes.filter((n) => typeof n === 'string' && n.includes('|'));
          if (tableLines.length >= 2) {
            const headerLine = tableLines[0];
            const headers = headerLine.split('|').map((c) => c.trim()).filter(Boolean);
            let startRow = 1;
            if (tableLines.length > 1 && /^[\s\-:|]+$/.test(tableLines[1])) {
              startRow = 2;
            }
            const rows = [];
            for (let i = startRow; i < tableLines.length; i++) {
              let cells = tableLines[i].split('|').map((c) => c.trim());
              if (tableLines[i].trim().startsWith('|') && cells[0] === '') cells.shift();
              if (tableLines[i].trim().endsWith('|') && cells[cells.length - 1] === '') cells.pop();
              if (cells.some((c) => c.length > 0)) {
                rows.push(cells);
              }
            }
            if (headers.length > 0 && rows.length > 0) {
              resolvedTableData = { headers, rows };
              // Filter out the raw pipe markdown strings from text bullets so it doesn't duplicate
              notes = notes.filter((n) => typeof n === 'string' && !n.includes('|'));
            }
          }
        }

        // Resolve SVG diagram: use Gemini's svgCode, or generate an authentic domain SVG across any subject so every concept card is visually illustrated
        const isAnimationOrMedia = Boolean(args.animationType || args.visualType === 'animation' || args.imageUrl || args.image || args.animationUrl);
        const resolvedSvgCode = args.svgCode || (
          !isAnimationOrMedia && topic && topic.length > 1
            ? generateUniversalTopicSvg(topic, notes, args.formula, args.subject)
            : null
        );
        const resolvedVisualType = args.visualType || (args.animationType ? 'animation' : resolvedSvgCode ? 'svg' : args.imageUrl ? 'photo' : null);

        const newItem = {
          id: args.id || ('wb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
          topic,
          notes,
          cardType: args.cardType || (args.animationType || args.visualType === 'animation' ? 'visual' : args.image ? 'image' : args.formula ? 'formula' : args.code ? 'code' : 'concept'),
          formula: args.formula || null,
          code: args.code || (args.component === 'code' ? args.content : null),
          language: (args.language || '').toLowerCase().trim() || null,
          question: args.question || null,
          studentAnswer,
          image: args.image || null,
          caption: args.caption || null,
          tableData: resolvedTableData,
          visualType: resolvedVisualType,
          animationType: args.animationType || null,
          animationUrl: args.animationUrl || null,
          thumbnailUrl: args.thumbnailUrl || null,
          isVideo: Boolean(args.isVideo),
          isGif: Boolean(args.isGif),
          simType: args.simType || null,
          simulationCode: args.simulationCode || null,
          equation: args.equation || null,
          sceneCode: args.sceneCode || null,
          videoUrl: args.videoUrl || null,
          isRendering: Boolean(args.isRendering),
          parameters: args.parameters || null,
          svgCode: resolvedSvgCode,
          imageUrl: args.imageUrl || null,
          imageTitle: args.imageTitle || null,
          attribution: args.attribution || null,
          subject: args.subject || null,
          video: args.video || null,
          timeline: Array.isArray(args.timeline) ? args.timeline : null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Merge notes if teacher continues elaborating on same topic
        setWhiteboardItems((prev) => {
          // If updating an existing item in-place by ID (e.g. Manim async compilation finished)
          if (args.id) {
            const existingIdx = prev.findIndex((it) => it.id === args.id);
            if (existingIdx !== -1) {
              const updatedList = [...prev];
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                ...newItem,
                id: args.id,
                notes: newItem.notes.length > 0 ? newItem.notes : updatedList[existingIdx].notes,
              };
              return updatedList;
            }
          }

          const lastItem = prev[prev.length - 1];
          if (
            lastItem &&
            lastItem.topic &&
            topic &&
            isSameOrRelatedTopic(lastItem.topic, topic)
          ) {
            // Dedicated cards (video timeline, visual diagrams) should NEVER be merged into plain text notes!
            const isNewItemTimeline = newItem.cardType === 'video_timeline' || Boolean(newItem.timeline);
            const isLastItemTimeline = lastItem.cardType === 'video_timeline' || Boolean(lastItem.timeline);
            if (isNewItemTimeline || isLastItemTimeline) {
              return [...prev, newItem];
            }

            const isNewItemAnimation = Boolean(newItem.animationType) || newItem.visualType === 'animation';
            const isLastItemAnimation = Boolean(lastItem.animationType) || lastItem.visualType === 'animation';

            // STAGE 2 PRESERVATION: An animation card must NEVER merge into an introductory textbook card!
            // It must append chronologically below so initial notes and static diagrams are 100% preserved.
            if (isNewItemAnimation && !isLastItemAnimation) {
              return [...prev, newItem];
            }

            const isNewItemVisual = Boolean(newItem.svgCode || newItem.imageUrl || newItem.cardType === 'visual' || newItem.visualType);
            const isLastItemVisual = Boolean(lastItem.svgCode || lastItem.imageUrl || lastItem.cardType === 'visual' || lastItem.visualType);

            // ANTI-DUPLICATION GUARD: If both are visual cards for the EXACT SAME topic or animation type, update the card in-place rather than duplicating!
            if (isNewItemVisual && isLastItemVisual) {
              const isSameTopic = isSameOrRelatedTopic(lastItem.topic, topic);
              const isSameAnim = (lastItem.animationType && lastItem.animationType === newItem.animationType) ||
                (lastItem.visualType && lastItem.visualType === newItem.visualType);
              if (isSameTopic && isSameAnim) {
                const updatedList = [...prev];
                updatedList[updatedList.length - 1] = {
                  ...lastItem,
                  ...newItem,
                  id: lastItem.id,
                  notes: newItem.notes.length > 0 ? newItem.notes : lastItem.notes,
                };
                return updatedList;
              }
              return [...prev, newItem];
            }

            const mergedNotes = [...lastItem.notes];
            for (const note of notes) {
              const noteClean = note.trim().toLowerCase();
              if (!mergedNotes.some((n) => n.trim().toLowerCase() === noteClean)) {
                mergedNotes.push(note);
              }
            }

            const updatedItem = {
              ...lastItem,
              notes: mergedNotes,
              formula: args.formula || lastItem.formula,
              code: args.code || lastItem.code,
              language: (args.language || '').toLowerCase().trim() || lastItem.language,
              question: args.question || lastItem.question,
              studentAnswer: studentAnswer || lastItem.studentAnswer,
              visualType: args.visualType || (resolvedSvgCode ? 'svg' : lastItem.visualType),
              svgCode: args.svgCode || lastItem.svgCode || resolvedSvgCode,
              imageUrl: args.imageUrl || lastItem.imageUrl,
              imageTitle: args.imageTitle || lastItem.imageTitle,
              attribution: args.attribution || lastItem.attribution,
              subject: args.subject || lastItem.subject,
              caption: args.caption || lastItem.caption,
              tableData: resolvedTableData || lastItem.tableData,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            const updatedList = [...prev];
            updatedList[updatedList.length - 1] = updatedItem;
            return updatedList;
          }

          return [...prev, newItem];
        });

        // Auto-load code into Code Lab if code was written
        if (newItem.code && onCodeGenerated) {
          onCodeGenerated(newItem.code, newItem.language);
        }
      },
      onTranscript: ({ sender, text, isPartial }) => {
        if (!text) return;

        if (sender === 'user' && !isPartial) {
          lastUserQueryRef.current = text;
        }

        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];

          if (lastMsg && lastMsg.sender === sender) {
            let nextText = text;
            if (sender === 'user') {
              nextText = text;
            } else {
              if (lastMsg.text.endsWith(text)) {
                nextText = lastMsg.text;
              } else {
                nextText = lastMsg.text + text;
              }
            }

            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMsg,
              text: nextText,
              isPartial,
            };
            messagesRef.current = updated;
            return updated;
          } else {
            const updated = [
              ...prev,
              {
                id: Date.now() + Math.random().toString(36).slice(2, 6),
                sender,
                text,
                isPartial,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
            messagesRef.current = updated;
            return updated;
          }
        });
      },
    });

    // Connect WebSocket
    let connectAttempt = 0;
    let connectedSuccessfully = false;
    let lastConnectError = null;

    while (connectAttempt < 2 && !connectedSuccessfully) {
      connectAttempt++;
      try {
        await clientInstance.connect(token, {
          model: targetModel,
          voiceName: selectedVoiceRef.current,
          systemInstruction: teacherSystemInstruction,
        });
        connectedSuccessfully = true;
      } catch (connErr) {
        lastConnectError = connErr;
        console.warn(`[useGeminiLive] Live connect attempt #${connectAttempt} failed, retrying in 400ms...`, connErr);
        if (connectAttempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    if (!connectedSuccessfully) {
      throw lastConnectError || new Error('Failed to connect to Gemini Live session.');
    }

    return clientInstance;
  };

  /**
   * Establishes active live session using createAndConnectClient
   */
  const establishLiveSession = async (targetModel, { isRotation = false } = {}) => {
    const client = await createAndConnectClient(targetModel, { isRotation });
    liveClientRef.current = client;
    return client;
  };

  /**
   * Automatically rotates or reconnects the session seamlessly without user intervention.
   */
  const handleAutoReconnect = async (isProactive = false) => {
    if (isExplicitlyEndedRef.current) return;
    if (isRotatingRef.current) return;

    if (reconnectAttemptsRef.current >= 5) {
      console.error('[useGeminiLive] Maximum auto-reconnect attempts reached (5). Terminating session.');
      setSessionStatus('disconnected');
      setConversationState('idle');
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      return;
    }

    isRotatingRef.current = true;
    reconnectAttemptsRef.current += 1;
    console.log(`[useGeminiLive] Auto-reconnecting session (attempt #${reconnectAttemptsRef.current}, proactive: ${isProactive})...`);

    if (isProactive && liveClientRef.current && liveClientRef.current.isConnected) {
      // ZERO-STUTTER HOT-HANDOFF: Keep old client active, connect new client in background
      try {
        const model = currentModelRef.current;
        const oldClient = liveClientRef.current;
        console.log('[useGeminiLive] Starting Hot-Handoff background connection with next pool key...');

        const newClient = await createAndConnectClient(model, { isRotation: true });

        // Atomically switch active client reference (0ms downtime)
        liveClientRef.current = newClient;
        isRotatingRef.current = false;
        reconnectAttemptsRef.current = 0;
        console.log('[useGeminiLive] Hot-Handoff completed successfully! Audio routed to new connection with 0ms gap.');

        // Allow 1.5s for any pending audio from oldClient to finish playing, then retire oldClient
        setTimeout(() => {
          try {
            oldClient.disconnect();
          } catch (_) { }
        }, 1500);

        return;
      } catch (hotErr) {
        console.warn('[useGeminiLive] Hot-Handoff background connection failed, falling back to standard reconnect:', hotErr);
      }
    }

    // Standard fallback reconnect (for unexpected network drop or socket error)
    if (liveClientRef.current) {
      try {
        liveClientRef.current.disconnect();
      } catch (_) { }
      liveClientRef.current = null;
    }

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }

    await new Promise((r) => setTimeout(r, 400));

    try {
      const model = currentModelRef.current;
      await establishLiveSession(model, { isRotation: true });
      console.log('[useGeminiLive] Session reconnected successfully via standard fallback.');
    } catch (err) {
      console.error('[useGeminiLive] Auto-reconnect attempt failed:', err);
      isRotatingRef.current = false;
      setTimeout(() => handleAutoReconnect(false), 1200);
    }
  };

  /**
   * Starts a voice session with the AI Teacher.
   */
  const startSession = useCallback(async (targetModel = currentModel) => {
    try {
      setError(null);
      isExplicitlyEndedRef.current = false;
      reconnectAttemptsRef.current = 0;
      isRotatingRef.current = false;
      setSessionStatus('connecting');
      setIsSearching(false);
      setSearchQuery('');
      hasTurnWhiteboardUpdateRef.current = false;
      currentTurnAssistantTextRef.current = '';

      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }

      // Disconnect any existing session before starting a new one
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stopAndClear();
      }

      await establishLiveSession(targetModel, { isRotation: false });

      // Initialize and start microphone recorder if not already active
      if (!audioRecorderRef.current) {
        let chunkCount = 0;
        audioRecorderRef.current = new AudioRecorder({
          onAudioChunk: (chunk) => {
            if (liveClientRef.current && liveClientRef.current.isConnected) {
              chunkCount++;
              if (chunkCount <= 3 || chunkCount % 50 === 0) {
                console.log(`[useGeminiLive] Transmitted chunk #${chunkCount} to Gemini Live.`);
              }
              liveClientRef.current.sendAudioChunk(chunk);
            }
          },
          onVolumeChange: (vol) => {
            inputVolumeRef.current = vol;
            if (vol > 0.08) {
              setConversationState((prev) => (prev === 'idle' ? 'listening' : prev));
            }
          },
        });
        await audioRecorderRef.current.start();
      }

      setCurrentModel(targetModel);
    } catch (err) {
      console.error('[useGeminiLive] Failed to start session:', err);
      setError(err.message || 'Failed to start session');
      setSessionStatus('error');
      setIsSearching(false);
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
    }
  }, [currentModel]);

  /**
   * Ends the active voice session manually.
   */
  const endSession = useCallback(() => {
    isExplicitlyEndedRef.current = true;
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAndClear();
    }
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setSessionStatus('disconnected');
    setConversationState('idle');
    setIsSearching(false);
    setSearchQuery('');
    inputVolumeRef.current = 0;
  }, []);

  /**
   * Toggles microphone mute.
   */
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRecorderRef.current) {
      audioRecorderRef.current.setMuted(nextMuted);
    }
  }, [isMuted]);

  /**
   * Sends text input to the model.
   */
  const sendTextMessage = useCallback((text) => {
    if (!text || !text.trim()) return;

    lastUserQueryRef.current = text.trim();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        sender: 'user',
        text: text.trim(),
        isPartial: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setConversationState('thinking');

    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendTextMessage(text.trim());
    } else {
      setError('Session not connected. Please click "Start Voice Session" or connect first.');
    }
  }, []);

  /**
   * Silently syncs environment updates (e.g. Code Lab code change or execution output) to the teacher.
   */
  const sendContextUpdate = useCallback((contextText) => {
    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendContextNotification(contextText);
    }
  }, []);

  /**
   * Switches model between Fast Voice and Deep Thinking Voice.
   */
  const switchModel = useCallback(async (newModel) => {
    if (newModel === currentModel) return;

    console.log(`[useGeminiLive] Switching model from ${currentModel} to ${newModel}`);
    setCurrentModel(newModel);

    if (sessionStatus === 'connected' || sessionStatus === 'connecting') {
      endSession();
      setTimeout(() => {
        startSession(newModel);
      }, 300);
    }
  }, [currentModel, sessionStatus, endSession, startSession]);

  /**
   * Allows user or UI to trigger manual browser action (navigate, reload, click, scroll).
   */
  const executeBrowserAction = useCallback(async (actionPayload) => {
    setBrowserState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/browser/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload),
      });

      if (res.ok) {
        const data = await res.json();
        setBrowserState((prev) => ({
          ...prev,
          isOpen: true,
          url: data.url,
          title: data.title,
          screenshot: data.screenshot,
          isLoading: false,
          lastAction: data.action,
          clickCoordinates: data.clickCoordinates,
          boundingBox: data.boundingBox,
          label: data.label,
          isReaderMode: data.isReaderMode,
          showSoMBadges: data.showSoMBadges,
          somCount: data.somCount,
        }));

        // If diagram clipped via manual action, add directly to whiteboard
        if (actionPayload.action === 'clip_whiteboard' && data.image) {
          setWhiteboardItems((prev) => [
            ...prev,
            {
              id: 'wb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              topic: data.caption || 'Clipped Web Diagram',
              notes: [],
              cardType: 'image',
              image: data.image,
              caption: data.caption,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        // Send user's navigation screenshot to Gemini Live visual input
        if (liveClientRef.current && liveClientRef.current.isConnected && data.screenshot) {
          liveClientRef.current.sendImageChunk(data.screenshot);
          liveClientRef.current.sendContextNotification(
            `[STUDENT BROWSER NAVIGATION]: Currently viewing "${data.title}" at ${data.url}.`
          );
        }
        return data;
      }
    } catch (err) {
      console.error('[useGeminiLive] Manual browser action error:', err);
    } finally {
      setBrowserState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  /**
   * Sends student's hand-drawn whiteboard snapshot to Gemini Live visual vision stream
   * for immediate inspection and spoken review.
   */
  const inspectWhiteboardSnapshot = useCallback((base64Jpeg) => {
    if (liveClientRef.current && liveClientRef.current.isConnected && base64Jpeg) {
      const sName = studentProfileRef.current?.name || 'Adi';
      setConversationState('thinking');
      // 1. Send both as streaming image chunk for vision buffer
      liveClientRef.current.sendImageChunk(base64Jpeg);
      // 2. Also send as inlineData inside the active conversational turn with turnComplete: true
      liveClientRef.current.sendVisualInspectionTurn({
        base64Jpeg,
        promptText: `[STUDENT WHITEBOARD DRAWING INSPECTION]: Look at the attached image showing ${sName}'s handwritten canvas strokes (drawn in dark pen/marker). Specifically examine what ${sName} drew/wrote (e.g. math numbers, letters like 'x', equations like 'x+5', coordinate axes, graphs, lines, or checkmarks). Speak out loud to ${sName} describing what you see, confirming if it's correct or what it means. DO NOT call write_on_whiteboard saying "whiteboard is empty"—the image shows their active handwritten strokes!`,
      });
    }
  }, []);

  return {
    sessionStatus,
    conversationState,
    currentModel,
    selectedVoice,
    setSelectedVoice,
    isMuted,
    inputVolume: inputVolumeRef.current,
    error,
    messages,
    isSearching,
    searchQuery,
    browserState,
    setBrowserState,
    executeBrowserAction,
    whiteboardItems,
    setWhiteboardItems,
    clearWhiteboard,
    restoreSessionContext,
    aiHighlightedTopic,
    aiLaserPoint,
    inspectWhiteboardSnapshot,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    sendContextUpdate,
    switchModel,
  };
}
