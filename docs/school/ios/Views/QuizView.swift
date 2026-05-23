import SwiftUI

@MainActor
@Observable
final class QuizViewModel {
    var quizData: QuizData?
    var error: String?
    var loading = true

    var subject: Subject = .math
    var unit: Int = 1
    var count: Int = 10

    var questions: [Question] = []
    var idx = 0
    var selected: String?
    var locked = false
    var score = 0
    var done = false
    var missed: [(q: String, correct: String, exp: String)] = []

    var availableUnits: [Int] {
        guard let data = quizData else { return [] }
        let bank = subject == .math ? data.math : data.science
        return subject.units.filter { bank[String($0)] != nil }
    }

    var pool: [Question] {
        guard let data = quizData else { return [] }
        let bank = subject == .math ? data.math : data.science
        return bank[String(unit)] ?? []
    }

    var allAnswers: [String] {
        guard let data = quizData else { return [] }
        let bank = subject == .math ? data.math : data.science
        return bank.values.flatMap { $0 }.map(\.a)
    }

    func load() async {
        loading = true
        do {
            quizData = try await APIService.quizzes()
            unit = availableUnits.first ?? 1
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    func start() {
        let shuffled = pool.shuffled().prefix(count)
        questions = Array(shuffled)
        idx = 0; selected = nil; locked = false; score = 0; done = false; missed = []
    }

    func options(for q: Question) -> [String] {
        var opts = [q.a]
        let distractors = allAnswers.filter { $0 != q.a }.shuffled().prefix(3)
        opts.append(contentsOf: distractors)
        return opts.shuffled()
    }

    func select(_ answer: String) {
        guard !locked else { return }
        selected = answer
        locked = true
        let current = questions[idx]
        if answer == current.a {
            score += 1
        } else {
            missed.append((q: current.q, correct: current.a, exp: current.exp))
        }
    }

    func next() {
        if idx + 1 < questions.count {
            idx += 1; selected = nil; locked = false
        } else {
            done = true
        }
    }

    func reset() {
        questions = []; idx = 0; selected = nil; locked = false
        score = 0; done = false; missed = []
    }
}

struct QuizView: View {
    @State private var vm = QuizViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.loading {
                    ProgressView().tint(.white)
                } else if let error = vm.error {
                    Text(error).foregroundStyle(.secondary).padding()
                } else if vm.questions.isEmpty {
                    QuizSetupView(vm: vm)
                } else if vm.done {
                    QuizResultsView(vm: vm)
                } else {
                    QuizSessionView(vm: vm)
                }
            }
            .navigationTitle("Quiz")
            .background(Color.black)
        }
        .task { await vm.load() }
    }
}

struct QuizSetupView: View {
    let vm: QuizViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                PickerRow(label: "Subject") {
                    ForEach(Subject.allCases, id: \.self) { s in
                        PillButton(s.label, active: vm.subject == s) { vm.subject = s }
                    }
                }
                PickerRow(label: "Unit") {
                    ForEach(vm.availableUnits, id: \.self) { u in
                        PillButton("U\(u)", active: vm.unit == u) { vm.unit = u }
                    }
                }
                PickerRow(label: "Questions") {
                    ForEach([5, 10, 20], id: \.self) { n in
                        PillButton("\(n)", active: vm.count == n) { vm.count = n }
                    }
                }
                Button("Start Quiz") { vm.start() }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white)
                    .foregroundStyle(Color.black)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .fontWeight(.semibold)
            }
            .padding()
        }
    }
}

struct QuizSessionView: View {
    let vm: QuizViewModel

    var current: Question { vm.questions[vm.idx] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("\(vm.idx + 1) / \(vm.questions.count)")
                    .font(.caption).foregroundStyle(.secondary)
                Text(current.q)
                    .font(.headline).fixedSize(horizontal: false, vertical: true)
                VStack(spacing: 10) {
                    ForEach(vm.options(for: current), id: \.self) { opt in
                        OptionButton(text: opt, correct: current.a, selected: vm.selected, locked: vm.locked) {
                            vm.select(opt)
                        }
                    }
                }
                if vm.locked {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(vm.selected == current.a ? "Correct" : "Wrong — \(current.a)")
                            .fontWeight(.semibold)
                            .foregroundStyle(vm.selected == current.a ? .green : .red)
                        Text(current.exp).font(.subheadline).foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    Button(vm.idx + 1 < vm.questions.count ? "Next" : "Results") { vm.next() }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
    }
}

struct QuizResultsView: View {
    let vm: QuizViewModel

    var pct: Double { Double(vm.score) / Double(vm.questions.count) * 100 }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("\(vm.score)/\(vm.questions.count)")
                    .font(.system(size: 56, weight: .thin))
                    .foregroundStyle(gradeColor(pct))
                Text(pct >= 80 ? "Solid" : pct >= 60 ? "Keep going" : "Review needed")
                    .foregroundStyle(.secondary)
                if !vm.missed.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Missed").fontWeight(.semibold)
                        ForEach(vm.missed, id: \.q) { item in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.q).font(.subheadline).foregroundStyle(.secondary)
                                Text(item.correct).font(.subheadline).foregroundStyle(.green)
                            }
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
                Button("Quiz Again") { vm.reset() }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white)
                    .foregroundStyle(Color.black)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .fontWeight(.semibold)
            }
            .padding()
        }
    }
}

struct PickerRow<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label).font(.caption).foregroundStyle(.secondary).textCase(.uppercase)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack { content }
            }
        }
    }
}

struct PillButton: View {
    let title: String
    let active: Bool
    let action: () -> Void

    init(_ title: String, active: Bool, action: @escaping () -> Void) {
        self.title = title; self.active = active; self.action = action
    }

    var body: some View {
        Button(title, action: action)
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(active ? Color.white : Color.white.opacity(0.08))
            .foregroundStyle(active ? Color.black : Color.white)
            .clipShape(Capsule())
            .animation(.spring(duration: 0.2), value: active)
    }
}

struct OptionButton: View {
    let text: String
    let correct: String
    let selected: String?
    let locked: Bool
    let action: () -> Void

    var color: Color {
        guard locked, let sel = selected else { return .white }
        if text == correct { return .green }
        if text == sel { return .red }
        return Color.white.opacity(0.3)
    }

    var body: some View {
        Button(action: action) {
            Text(text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(color.opacity(0.08))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(color.opacity(locked ? 1 : 0.2)))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(color)
        }
        .disabled(locked)
        .animation(.easeOut(duration: 0.2), value: locked)
    }
}
