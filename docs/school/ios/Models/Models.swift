import Foundation

// MARK: - Grades

struct GradesPayload: Codable, Sendable {
    let grades: GradesData
    let meta: GradesMeta
}

struct GradesMeta: Codable, Sendable {
    let lastUpdated: String?
    let stale: Bool
    let ageHours: Double?
}

struct GradesData: Codable, Sendable {
    let retrieved_at: String?
    let courses: [Course]
}

struct Course: Codable, Sendable, Identifiable {
    var id: String { course_ou }
    let course: String
    let course_ou: String
    let categories: [GradeCategory]

    var shortName: String {
        if course.contains("Pre-Calculus") { return "Pre-Calculus 12" }
        if course.contains("Anatomy") { return "Anatomy & Physiology 12" }
        return course.components(separatedBy: ",").first ?? course
    }
}

struct GradeCategory: Codable, Sendable, Identifiable {
    var id: String { category }
    let category: String
    let grade_pct: Double?
    let items: [GradeItem]
}

struct GradeItem: Codable, Sendable, Identifiable {
    var id: String { name }
    let name: String
    let score: Double?
    let out_of: Double?
    let percentage: Double?
}

// MARK: - Quizzes

struct QuizData: Codable, Sendable {
    let math: [String: [Question]]
    let science: [String: [Question]]
    let generated_at: String?
}

struct Question: Codable, Sendable, Identifiable {
    var id: String { q }
    let q: String
    let a: String
    let exp: String
}

enum Subject: String, CaseIterable, Sendable {
    case math = "math"
    case science = "science"
    var label: String { self == .math ? "Math" : "Science" }
    var units: [Int] { self == .math ? Array(1...7) : Array(1...9) }
}
