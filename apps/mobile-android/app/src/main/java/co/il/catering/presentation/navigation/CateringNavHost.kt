package co.il.catering.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import co.il.catering.domain.model.UserRole
import co.il.catering.presentation.screens.RootViewModel
import co.il.catering.presentation.screens.agent.CrmScreen
import co.il.catering.presentation.screens.agent.LeadDetailScreen
import co.il.catering.presentation.screens.auth.BiometricScreen
import co.il.catering.presentation.screens.auth.LoginScreen
import co.il.catering.presentation.screens.customer.MyOrdersScreen
import co.il.catering.presentation.screens.customer.NewOrderScreen
import co.il.catering.presentation.screens.customer.OrderStatusScreen
import co.il.catering.presentation.screens.driver.DeliveriesScreen
import co.il.catering.presentation.screens.driver.NavigateScreen
import co.il.catering.presentation.screens.driver.SignatureScreen
import co.il.catering.presentation.screens.kitchen.MarkDoneScreen
import co.il.catering.presentation.screens.kitchen.PrepTasksScreen
import co.il.catering.presentation.screens.manager.DashboardScreen
import co.il.catering.presentation.screens.shared.BarcodeScannerScreen
import co.il.catering.presentation.screens.shared.CameraOcrScreen
import co.il.catering.presentation.screens.shared.SettingsScreen
import co.il.catering.presentation.screens.shift.ClockScreen
import co.il.catering.presentation.screens.shift.MyShiftsScreen
import co.il.catering.presentation.screens.shift.RequestSwapScreen

/**
 * NavHost ראשי. בעת כניסה מציג Login, אחרי התחברות מנתב לפי תפקיד.
 */
@Composable
fun CateringNavHost(vm: RootViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val state by vm.state.collectAsStateWithLifecycle()

    val start = if (!state.loggedIn) Routes.LOGIN else startFor(state.role)

    NavHost(navController = navController, startDestination = start) {
        composable(Routes.LOGIN) {
            LoginScreen(onLoggedIn = { role ->
                navController.navigate(startFor(role)) {
                    popUpTo(Routes.LOGIN) { inclusive = true }
                }
            })
        }
        composable(Routes.BIOMETRIC) {
            BiometricScreen(onSuccess = {
                navController.navigate(startFor(state.role)) {
                    popUpTo(Routes.BIOMETRIC) { inclusive = true }
                }
            })
        }

        // Manager
        composable(Routes.MANAGER_DASHBOARD) { DashboardScreen(navController) }

        // Agent
        composable(Routes.AGENT_CRM) {
            CrmScreen(onLeadClick = { id -> navController.navigate(Routes.agentLead(id)) })
        }
        composable(
            Routes.AGENT_LEAD_DETAIL,
            arguments = listOf(navArgument("leadId") { type = NavType.StringType }),
        ) { entry ->
            LeadDetailScreen(
                leadId = entry.arguments?.getString("leadId").orEmpty(),
                onBack = { navController.popBackStack() },
            )
        }

        // Kitchen
        composable(Routes.KITCHEN_PREP) {
            PrepTasksScreen(onTaskClick = { id -> navController.navigate(Routes.kitchenMark(id)) })
        }
        composable(
            Routes.KITCHEN_MARK_DONE,
            arguments = listOf(navArgument("taskId") { type = NavType.StringType }),
        ) { entry ->
            MarkDoneScreen(
                taskId = entry.arguments?.getString("taskId").orEmpty(),
                onDone = { navController.popBackStack() },
            )
        }

        // Shift
        composable(Routes.SHIFT_CLOCK) { ClockScreen() }
        composable(Routes.SHIFT_LIST) {
            MyShiftsScreen(onSwap = { id -> navController.navigate(Routes.shiftSwap(id)) })
        }
        composable(
            Routes.SHIFT_SWAP,
            arguments = listOf(navArgument("shiftId") { type = NavType.StringType }),
        ) { entry ->
            RequestSwapScreen(
                shiftId = entry.arguments?.getString("shiftId").orEmpty(),
                onSent = { navController.popBackStack() },
            )
        }

        // Driver
        composable(Routes.DRIVER_LIST) {
            DeliveriesScreen(
                onNavigate = { id -> navController.navigate(Routes.driverNavigate(id)) },
                onSignature = { id -> navController.navigate(Routes.driverSignature(id)) },
            )
        }
        composable(
            Routes.DRIVER_NAVIGATE,
            arguments = listOf(navArgument("deliveryId") { type = NavType.StringType }),
        ) { entry ->
            NavigateScreen(deliveryId = entry.arguments?.getString("deliveryId").orEmpty())
        }
        composable(
            Routes.DRIVER_SIGNATURE,
            arguments = listOf(navArgument("deliveryId") { type = NavType.StringType }),
        ) { entry ->
            SignatureScreen(
                deliveryId = entry.arguments?.getString("deliveryId").orEmpty(),
                onDone = { navController.popBackStack() },
            )
        }

        // Customer
        composable(Routes.CUSTOMER_ORDERS) {
            MyOrdersScreen(
                onNewOrder = { navController.navigate(Routes.CUSTOMER_NEW_ORDER) },
                onOrderClick = { id -> navController.navigate(Routes.customerStatus(id)) },
            )
        }
        composable(Routes.CUSTOMER_NEW_ORDER) {
            NewOrderScreen(onCreated = { navController.popBackStack() })
        }
        composable(
            Routes.CUSTOMER_STATUS,
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            OrderStatusScreen(orderId = entry.arguments?.getString("orderId").orEmpty())
        }

        // Shared
        composable(Routes.CAMERA_OCR) {
            CameraOcrScreen(onResult = { navController.popBackStack() })
        }
        composable(Routes.BARCODE) {
            BarcodeScannerScreen(onScanned = { navController.popBackStack() })
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(onLoggedOut = {
                navController.navigate(Routes.LOGIN) { popUpTo(0) }
            })
        }
    }
}

private fun startFor(role: UserRole?): String = when (role) {
    UserRole.MANAGER -> Routes.MANAGER_DASHBOARD
    UserRole.AGENT -> Routes.AGENT_CRM
    UserRole.KITCHEN -> Routes.KITCHEN_PREP
    UserRole.SHIFT -> Routes.SHIFT_CLOCK
    UserRole.DRIVER -> Routes.DRIVER_LIST
    UserRole.CUSTOMER -> Routes.CUSTOMER_ORDERS
    null -> Routes.LOGIN
}
