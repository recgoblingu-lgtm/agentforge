import SwiftUI
import FoundationModels

@main
struct ArphixApp: App {
    var body: some Scene {
        WindowGroup {
            ChatView()
        }
    }
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: String
    let text: String
}

@MainActor
final class ArphixViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var input = ""
    @Published var isGenerating = false
    @Published var status = "Checking Apple Intelligence…"
    @Published var error: String?

    private var session: LanguageModelSession?

    init() {
        let model = SystemLanguageModel.default
        switch model.availability {
        case .available:
            status = "Arphix is ready offline"
            session = LanguageModelSession(instructions: "You are Arphix, a helpful private AI assistant. Work entirely on-device. Give direct answers, write complete code when asked, and never claim to browse or call an online service.")
        case .unavailable(let reason):
            status = "Apple on-device AI is unavailable"
            error = "This iPhone cannot currently use Apple Foundation Models: \(reason)"
        @unknown default:
            status = "Apple on-device AI is unavailable"
            error = "This device did not report support for Apple Foundation Models."
        }
    }

    func send() {
        let prompt = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, !isGenerating else { return }
        guard let session else {
            error = "Arphix needs an Apple Intelligence-capable iPhone with the on-device model ready."
            return
        }

        input = ""
        messages.append(ChatMessage(role: "You", text: prompt))
        messages.append(ChatMessage(role: "Arphix", text: ""))
        isGenerating = true
        error = nil

        Task {
            do {
                let stream = session.streamResponse(to: prompt)
                for try await partial in stream {
                    messages[messages.count - 1] = ChatMessage(role: "Arphix", text: partial.content)
                }
                status = "Arphix is ready offline"
            } catch {
                messages.removeLast()
                self.error = "Local generation failed: \(error.localizedDescription)"
            }
            isGenerating = false
        }
    }
}

struct ChatView: View {
    @StateObject private var model = ArphixViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 14) {
                        ForEach(model.messages) { message in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(message.role)
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(message.role == "Arphix" ? .teal : .secondary)
                                Text(message.text)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .textSelection(.enabled)
                            }
                            .padding()
                            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
                        }
                    }
                    .padding()
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(model.status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let error = model.error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    HStack(alignment: .bottom) {
                        TextField("Message Arphix…", text: $model.input, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                        Button("Send") { model.send() }
                            .buttonStyle(.borderedProminent)
                            .disabled(model.input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.isGenerating)
                    }
                }
                .padding()
            }
            .navigationTitle("Arphix")
        }
    }
}
