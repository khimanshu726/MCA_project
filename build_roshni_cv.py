from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether

OUTPUT = "output/pdf/Roshni_Kumari_ATS_Optimized_CV.pdf"

NAVY = colors.HexColor("#16324F")
TEXT = colors.HexColor("#1E293B")
MUTED = colors.HexColor("#475569")

styles = getSampleStyleSheet()
name = ParagraphStyle("Name", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=20,
                      leading=23, textColor=NAVY, alignment=TA_CENTER, spaceAfter=3)
subtitle = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=9.4,
                          leading=12, textColor=MUTED, alignment=TA_CENTER, spaceAfter=8)
section = ParagraphStyle("Section", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.2,
                         leading=12, textColor=NAVY, spaceBefore=8, spaceAfter=4,
                         borderWidth=0.6, borderColor=colors.HexColor("#A8C3D8"), borderPadding=2,
                         borderSide="BOTTOM")
body = ParagraphStyle("Body", parent=styles["Normal"], fontName="Helvetica", fontSize=8.8,
                      leading=11.6, textColor=TEXT, spaceAfter=2)
entry = ParagraphStyle("Entry", parent=body, fontName="Helvetica-Bold", fontSize=9.1, leading=11.5,
                       spaceBefore=2, spaceAfter=1)
meta = ParagraphStyle("Meta", parent=body, fontName="Helvetica", fontSize=8.6, leading=10.8,
                      textColor=MUTED, spaceAfter=2)
bullet = ParagraphStyle("Bullet", parent=body, leftIndent=12, firstLineIndent=-7, bulletIndent=3,
                        spaceAfter=1.7)

def p(text, style=body):
    return Paragraph(text, style)

def bullets(items):
    return [Paragraph(item, bullet, bulletText="•") for item in items]

story = [
    p("ROSHNI KUMARI", name),
    p("MCA Student | Full-Stack MERN Developer", subtitle),
    p("Varanasi, India | +91-9123258420 | roshnikumariofficial8420@gmail.com | LinkedIn | GitHub", subtitle),
    p("PROFESSIONAL SUMMARY", section),
    p("Postgraduate MCA student and aspiring Full-Stack MERN Developer with hands-on experience designing and building end-to-end web applications using React.js, Node.js, Express.js, and MongoDB. Skilled in RESTful API development, authentication workflows, responsive user interfaces, database design, and Git-based version control. Strong foundation in Data Structures and Algorithms, Object-Oriented Programming, DBMS, Operating Systems, and Computer Networks. Seeking an entry-level software development opportunity to contribute clean, scalable, and user-focused solutions.", body),
    p("TECHNICAL SKILLS", section),
    p("<b>Languages:</b> C++, JavaScript, SQL, HTML5, CSS3", body),
    p("<b>Frontend:</b> React.js, Tailwind CSS, Bootstrap, Responsive Web Design", body),
    p("<b>Backend:</b> Node.js, Express.js, RESTful APIs, JWT Authentication, Google OAuth 2.0", body),
    p("<b>Databases:</b> MongoDB, MongoDB Atlas, Database Design, CRUD Operations", body),
    p("<b>Tools:</b> Git, GitHub, Postman, VS Code, Vercel", body),
    p("<b>Core Concepts:</b> Data Structures and Algorithms, Object-Oriented Programming, DBMS, Operating Systems, Computer Networks", body),
    p("PROJECTS", section),
    p("Campus Lost &amp; Found Portal | React.js, Node.js, Express.js, MongoDB, Google OAuth 2.0, Tailwind CSS", entry),
    *bullets([
        "Developed a full-stack MERN portal for students to report lost items, submit ownership claims, and track request status.",
        "Designed RESTful APIs and MongoDB schemas for users, items, and claims, supporting CRUD operations and role-based approval workflows.",
        "Integrated Google OAuth 2.0 for streamlined authentication and built a responsive interface with search and category filters."
    ]),
    p("AI-Powered Developer Portfolio | React.js, Node.js, Express.js, MongoDB, Google Gemini API", entry),
    *bullets([
        "Built a full-stack personal portfolio featuring an AI chatbot that responds to visitor questions about skills, projects, and experience.",
        "Implemented server-side Gemini API request handling and prompt logic with Node.js and Express.js for context-aware responses.",
        "Created a responsive React.js chat interface and maintained a modular codebase with Git and GitHub."
    ]),
    p("Zerodha Clone - Full-Stack Stock Trading Platform | React.js, Node.js, Express.js, MongoDB Atlas, Bootstrap", entry),
    *bullets([
        "Built a responsive stock-trading platform with reusable React components, client-side routing, and multi-page navigation.",
        "Implemented Node.js and Express.js RESTful APIs and MongoDB Atlas CRUD workflows for application data management.",
        "Applied modular project architecture, responsive HTML/CSS/Bootstrap styling, and Git/GitHub version control."
    ]),
    p("EDUCATION", section),
    p("Master of Computer Applications (MCA) | CGPA: 6.8", entry),
    p("Banaras Hindu University, Varanasi | Aug 2025 - Present", meta),
    p("Bachelor of Computer Applications (BCA) | CGPA: 8.29", entry),
    p("NIIS Institute of Information Science and Management | Aug 2022 - Jun 2025", meta),
    p("ACHIEVEMENTS", section),
    *bullets([
        "Selected as an Open Source Contributor, GirlScript Summer of Code (GSSoC).",
        "Solved 273+ LeetCode problems; Top 90.58%; contest rating: 1367 (Profile: Roshni_Kumari2004).",
        "Completed 500+ coding submissions in the past year and maintained a 240-day active LeetCode streak."
    ])
]

doc = SimpleDocTemplate(OUTPUT, pagesize=A4, rightMargin=0.55*inch, leftMargin=0.55*inch,
                        topMargin=0.42*inch, bottomMargin=0.42*inch, title="Roshni Kumari - ATS Optimized CV",
                        author="Roshni Kumari")
doc.build(story)
print(OUTPUT)
