import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if !appState.isAuthenticated {
                LoginView()
            } else {
                switch appState.role {
                case .manager:
                    DashboardView()
                case .agent:
                    CrmView()
                case .kitchen:
                    PrepTasksView()
                case .shift:
                    ClockView()
                case .driver:
                    DeliveriesView()
                case .customer:
                    MyOrdersView()
                case .none:
                    LoginView()
                }
            }
        }
        .font(.custom("Heebo-Regular", size: 16))
        .preferredColorScheme(.light)
    }
}
