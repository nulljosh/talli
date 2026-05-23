import SwiftUI

struct GradesView: View {
    @State private var payload: GradesPayload?
    @State private var error: String?
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView().tint(.white)
                } else if let error {
                    Text(error).foregroundStyle(.secondary).padding()
                } else if let courses = payload?.grades.courses {
                    List {
                        ForEach(courses) { course in
                            CourseSection(course: course)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Grades")
            .background(Color.black)
        }
        .task { await load() }
    }

    func load() async {
        loading = true
        error = nil
        do {
            payload = try await APIService.grades()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

struct CourseSection: View {
    let course: Course

    var average: Double? {
        let pcts = course.categories.flatMap(\.items).compactMap(\.percentage)
        guard !pcts.isEmpty else { return nil }
        return pcts.reduce(0, +) / Double(pcts.count)
    }

    var body: some View {
        Section {
            ForEach(course.categories) { cat in
                if !cat.items.isEmpty {
                    CategoryRow(category: cat)
                }
            }
        } header: {
            HStack {
                Text(course.shortName)
                Spacer()
                if let avg = average {
                    Text("\(Int(avg.rounded()))%")
                        .foregroundStyle(gradeColor(avg))
                        .fontWeight(.semibold)
                }
            }
        }
    }
}

struct CategoryRow: View {
    let category: GradeCategory
    @State private var expanded = false

    var avg: Double? {
        let pcts = category.items.compactMap(\.percentage)
        guard !pcts.isEmpty else { return nil }
        return pcts.reduce(0, +) / Double(pcts.count)
    }

    var body: some View {
        DisclosureGroup(isExpanded: $expanded) {
            ForEach(category.items) { item in
                HStack {
                    Text(item.name).foregroundStyle(.secondary).font(.subheadline)
                    Spacer()
                    if let pct = item.percentage {
                        Text("\(Int(pct.rounded()))%").foregroundStyle(gradeColor(pct)).font(.subheadline)
                    } else {
                        Text("--").foregroundStyle(.tertiary).font(.subheadline)
                    }
                }
            }
        } label: {
            HStack {
                Text(category.category)
                Spacer()
                if let avg {
                    Text("\(Int(avg.rounded()))%").foregroundStyle(gradeColor(avg)).font(.subheadline)
                }
            }
        }
    }
}

func gradeColor(_ pct: Double) -> Color {
    if pct >= 80 { return .green }
    if pct >= 60 { return Color(red: 0.85, green: 0.65, blue: 0.1) }
    return .red
}
