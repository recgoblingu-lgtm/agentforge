# Arphix Native

This is the correct architecture for a fast, offline Arphix on supported iPhones: a native SwiftUI app using Apple's `FoundationModels` framework and the Apple on-device model. It does not use Llama, an API key, a web service, or an inference server.

Apple documents Foundation Models for iOS 26 and later. The framework uses the on-device model behind Apple Intelligence, and `LanguageModelSession` supports streaming responses. The phone must support Apple Intelligence and have the on-device model available. Unsupported devices are reported explicitly in the app.

## Important device limitation

This source code is not a Pythonista script and cannot be compiled inside Pythonista. Apple does not expose Foundation Models as a Python module. It must be built as a native Swift app using Xcode on a Mac or Swift Playgrounds on an iPad/Mac. Swift Playgrounds is not an iPhone development environment.

## Setup

Create a new SwiftUI app project named `Arphix`, set the deployment target to iOS 26 or later, add `ArphixApp.swift`, and run it on an Apple Intelligence-capable iPhone. The first Apple Intelligence model preparation may require an internet connection and sufficient device storage. After the model is ready, prompts and responses run on-device and can work without Wi-Fi.

If the app reports that Apple Intelligence is unavailable, there is no code-only workaround. The device must support Apple Intelligence, the operating system must be current, and the on-device model must be available.

## Sources

- [Apple Foundation Models documentation](https://developer.apple.com/documentation/foundationmodels)
- [Apple: Bring on-device AI to your app](https://developer.apple.com/videos/play/wwdc2025/259/)
- [Apple Swift Playgrounds](https://developer.apple.com/swift-playground/)
