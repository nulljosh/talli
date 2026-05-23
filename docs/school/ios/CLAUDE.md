# school-ios — Claude Notes

## Overview
Native iOS 17 + macOS 14 app for school.heyitsmejosh.com. SwiftUI, Swift 6, no external dependencies. Two tabs: live D2L grades + multiple-choice quizzes.

Data source: `https://school.heyitsmejosh.com` (Vercel — separate project from tally, must `vercel --prod` from `tally/school/` to deploy).

Subject structure mirrors `~/Documents/School/`:
- **math**: units 1-7 (Pre-Calculus 12)
- **science**: units 1-9 (Biology/A&P 12)

If a unit is added to `~/Documents/School/`, add quiz data for it via `tally/school/tools/generate_quizzes.py` and update `Subject.units` in `Models/Models.swift`.

## Build
```bash
cd ~/Documents/Code/school-ios
xcodegen generate
open School.xcodeproj
```

## Deploy
```bash
git push origin main  # GitHub: nulljosh/school-ios
```

## Key Files
- `Models/Models.swift` — GradesPayload, QuizData, Question, Subject enum
- `Services/APIService.swift` — fetches /api/grades and /api/quizzes
- `Views/GradesView.swift` — CourseSection, CategoryRow, gradeColor()
- `Views/QuizView.swift` — QuizViewModel, setup → session → results flow
- `project.yml` — xcodegen config (iOS + macOS targets, team QMM486NPYC)
