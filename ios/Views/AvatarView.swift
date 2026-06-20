import SwiftUI

struct AvatarView: View {
    let size: CGFloat
    var accent: Color = .talliOrange
    @Environment(AppState.self) private var appState

    var body: some View {
        if let data = appState.avatarImageData, let uiImage = UIImage(data: data) {
            Image(uiImage: uiImage)
                .resizable()
                .scaledToFill()
                .frame(width: size, height: size)
                .clipShape(Circle())
        } else {
            Circle()
                .fill(accent.opacity(0.15))
                .frame(width: size, height: size)
                .overlay {
                    Text(appState.username.flatMap { $0.first.map(String.init) }?.uppercased() ?? "?")
                        .font(.system(size: size * 0.43, weight: .semibold))
                        .foregroundStyle(accent)
                }
        }
    }
}
