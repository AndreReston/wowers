export const ROLES = ["Admin", "Teacher", "Student", "Applicant"];

export const ROLE_META = {
  Admin:     { color: "#1a1a2e", accent: "#e94560", light: "#fff0f3", icon: "⬡", desc: "Full system control" },
  Teacher:   { color: "#0f3460", accent: "#1565c0", light: "#eef4ff", icon: "◈", desc: "Manage classes & students" },
  Student:   { color: "#1b4332", accent: "#2d6a4f", light: "#eafaf1", icon: "◎", desc: "View schedule & enroll" },
  Applicant: { color: "#5c2a00", accent: "#a05800", light: "#fff8ee", icon: "◇", desc: "Submit application" },
};

export const PERMISSIONS = {
  Admin:     ["Manage Users", "Manage Rooms", "View Reports", "System Settings", "Approve Enrollments", "Library Admin"],
  Teacher:   ["View Students", "Mark Attendance", "Manage Grades", "Book Rooms", "View Schedule"],
  Student:   ["View Schedule", "Enroll in Subjects", "View Grades", "Borrow Books"],
  Applicant: ["Submit Application", "Upload Documents", "Track Application Status"],
};

export const COURSES = ["BSIT", "BSCS", "BSED", "BSBA", "BSN", "BSCRIM"];
export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
export const SECTIONS = ["BSIT-1A","BSIT-1B","BSCS-2A","BSCS-2B","BSIT-3A","BSIT-3B","BSCS-4A","None"];
export const DOCS = ["Birth Certificate", "Form 138 (Report Card)", "Good Moral Certificate", "Medical Certificate", "2x2 ID Photo", "Barangay Clearance"];
export const STAGES = ["Applicant", "Under Review", "For Interview", "Approved", "Enrolled", "Rejected"];
export const NEXT_STAGE = { "Applicant": "Under Review", "Under Review": "For Interview", "For Interview": "Approved", "Approved": "Enrolled" };

export const STAGE_COLOR = {
  "Applicant":     { bg: "#f1efea", color: "#444441", border: "#b4b2a9" },
  "Under Review":  { bg: "#eef4ff", color: "#0f3460", border: "#b5d4f4" },
  "For Interview": { bg: "#fff8ee", color: "#633806", border: "#fac775" },
  "Approved":      { bg: "#eeedfe", color: "#3c3489", border: "#afa9ec" },
  "Enrolled":      { bg: "#e1f5ee", color: "#0f6e56", border: "#5dcaa5" },
  "Rejected":      { bg: "#fcebeb", color: "#791f1f", border: "#f09595" },
};
export const STAGE_ICON = { "Applicant": "◇", "Under Review": "◈", "For Interview": "◎", "Approved": "◉", "Enrolled": "⬡", "Rejected": "✕" };

export const FLOORS = ["Ground Floor", "2nd Floor", "3rd Floor"];
export const CATEGORIES = ["Classroom", "Laboratory", "Library", "Gym", "Faculty Room", "Admin Office", "Canteen", "Clinic"];
export const CAT_ICON = { Classroom: "◫", Laboratory: "⬡", Library: "▣", Gym: "◉", "Faculty Room": "◈", "Admin Office": "⬛", Canteen: "◎", Clinic: "✚" };
export const CAT_COLOR = {
  Classroom:       { bg: "#eef4ff", color: "#0f3460", border: "#b5d4f4" },
  Laboratory:      { bg: "#eeedfe", color: "#3c3489", border: "#afa9ec" },
  Library:         { bg: "#e1f5ee", color: "#0f6e56", border: "#5dcaa5" },
  Gym:             { bg: "#fff8ee", color: "#633806", border: "#fac775" },
  "Faculty Room":  { bg: "#fbeaf0", color: "#72243e", border: "#ed93b1" },
  "Admin Office":  { bg: "#f1efea", color: "#444441", border: "#b4b2a9" },
  Canteen:         { bg: "#eaf3de", color: "#27500a", border: "#97c459" },
  Clinic:          { bg: "#fcebeb", color: "#791f1f", border: "#f09595" },
};
export const STATUS_STYLE = {
  Available:   { bg: "#eafaf1", color: "#1b4332" },
  Occupied:    { bg: "#fff0f3", color: "#7a1c2e" },
  Maintenance: { bg: "#fff8ee", color: "#7a4500" },
};

export const ACADEMIC_YEARS = ["2024-2025", "2025-2026", "2026-2027"];
export const SEMESTERS = ["1st Semester", "2nd Semester"];
export const CURRENT_AY = "2025-2026";
export const CURRENT_SEMESTER = "2nd Semester";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const TIME_SLOTS = ["7:00–8:00", "8:00–9:00", "9:00–10:00", "10:00–11:00", "11:00–12:00", "13:00–14:00", "14:00–15:00", "15:00–16:00", "16:00–17:00"];

export const GRADE_COMPONENTS = ["Quizzes", "Activities", "Midterm", "Finals"];
export const ATTENDANCE_STATUS = ["Present", "Absent", "Late", "Excused"];
export const ANN_TARGETS = ["All", "Students", "Teachers"];

export const BOOK_CATEGORIES = ["ICT", "Mathematics", "Science", "Humanities", "Business", "Other"];
export const MAX_BORROW_LIMIT = { Student: 3, Teacher: 5, Admin: 10 };
export const FINE_PER_DAY = 20;

export const TRANSMUTATION_TABLE = [
  { min: 98, max: 100, grade: 1.00 },
  { min: 95, max: 97,  grade: 1.25 },
  { min: 92, max: 94,  grade: 1.50 },
  { min: 89, max: 91,  grade: 1.75 },
  { min: 86, max: 88,  grade: 2.00 },
  { min: 83, max: 85,  grade: 2.25 },
  { min: 80, max: 82,  grade: 2.50 },
  { min: 77, max: 79,  grade: 2.75 },
  { min: 75, max: 76,  grade: 3.00 },
  { min: 0,  max: 74,  grade: 5.00 },
];
export const SPECIAL_REMARKS = ["Passed", "Failed", "INC", "NFE", "Dropped", "Withdrawn"];

export const HONORS = [
  { label: "Summa Cum Laude", maxGWA: 1.20, color: "#791f1f", bg: "#fcebeb", border: "#f09595" },
  { label: "Magna Cum Laude", maxGWA: 1.50, color: "#633806", bg: "#fff8ee", border: "#fac775" },
  { label: "Cum Laude",       maxGWA: 1.75, color: "#0f3460", bg: "#eef4ff", border: "#b5d4f4" },
  { label: "Dean's List",     maxGWA: 2.00, color: "#0f6e56", bg: "#e1f5ee", border: "#5dcaa5" },
];

export const CLEARANCE_OFFICES = ["Library", "Accounting", "Registrar", "Laboratory", "Student Affairs"];
export const FEE_TYPES = ["Tuition", "Misc Fee", "Lab Fee", "Library Fee", "PE Fee", "Registration", "ID Fee"];
export const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer", "Maya"];
export const DOC_TYPES = ["Transcript of Records (TOR)", "Certificate of Registration (COR)", "Certificate of Enrollment", "Certificate of Good Moral", "Diploma (Photocopy)", "Student ID Request"];
export const DOC_PURPOSES = ["Scholarship", "Employment", "Further Studies", "Government Requirement", "Personal Use"];
export const WITHDRAWAL_REASONS = ["Personal / Family Reasons", "Financial Difficulty", "Health / Medical Reasons", "Transferring to Another School", "Course Shifting", "Work Commitment", "Other"];
export const SHIFT_REASONS = ["Change of Academic Interest", "Career Path Realignment", "Failed Pre-Requisites in Current Course", "Family / Financial Reasons", "Medical Advice", "Other"];

export const today = () => new Date().toISOString().slice(0, 10);
export const dueDate = (days = 7) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

export const transmute = (raw) => {
  if (raw === null || raw === undefined) return null;
  const entry = TRANSMUTATION_TABLE.find(t => raw >= t.min && raw <= t.max);
  return entry ? entry.grade : 5.00;
};

export const transmuteLabel = (grade) => {
  if (grade === null) return "—";
  if (grade === 5.00) return "5.00 (Failed)";
  return grade.toFixed(2);
};

export const gradeDescription = (grade) => {
  if (grade === null) return "";
  if (grade <= 1.00) return "Excellent";
  if (grade <= 1.50) return "Superior";
  if (grade <= 2.00) return "Very Good";
  if (grade <= 2.50) return "Good";
  if (grade <= 3.00) return "Satisfactory";
  return "Failed";
};

export const getHonor = (gwa) => {
  if (gwa === null) return null;
  return HONORS.find(h => gwa <= h.maxGWA) || null;
};

export const computeGrade = (g) => Math.round((+g.quizzes || 0) * 0.2 + (+g.activities || 0) * 0.2 + (+g.midterm || 0) * 0.3 + (+g.finals || 0) * 0.3);

export const gradeColor = (n) => n >= 90 ? "#1b4332" : n >= 80 ? "#0f3460" : n >= 75 ? "#633806" : "#7a1c2e";

export const validSectionsFor = (course, year) => {
  return SECTIONS.filter(section => {
    if (section === "None") return false;
    const [c, level] = section.split("-");
    const yearNum = level?.match(/^([1-4])/);
    const yearMap = { "1": "1st Year", "2": "2nd Year", "3": "3rd Year", "4": "4th Year" };
    return c === course && yearMap[yearNum?.[1]] === year;
  });
};

export const detectScheduleConflicts = (subjects, newSubject) => {
  const roomConflict = subjects.find(s =>
    s.id !== newSubject.id &&
    s.room_id === newSubject.roomId &&
    s.day === newSubject.day &&
    s.time_slot === newSubject.time &&
    s.semester === newSubject.semester &&
    s.academic_year === newSubject.academicYear
  );
  if (roomConflict) return { type: "room", msg: `Room already booked at this time` };

  const teacherConflict = subjects.find(s =>
    s.id !== newSubject.id &&
    s.teacher_id === newSubject.teacherId &&
    s.day === newSubject.day &&
    s.time_slot === newSubject.time &&
    s.semester === newSubject.semester &&
    s.academic_year === newSubject.academicYear
  );
  if (teacherConflict) return { type: "teacher", msg: `Teacher already assigned to another subject at this time` };

  return null;
};
