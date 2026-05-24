import XCTest

final class CateringRTLUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testLaunchInHebrewRTL() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(he)", "-AppleLocale", "he_IL"]
        app.launch()
        XCTAssertTrue(app.staticTexts["התחברות"].waitForExistence(timeout: 5))
    }

    func testLoginFlow() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(he)", "-AppleLocale", "he_IL", "-UITest"]
        app.launch()
        let email = app.textFields.firstMatch
        email.tap(); email.typeText("test@syncup.co.il")
        let pwd = app.secureTextFields.firstMatch
        pwd.tap(); pwd.typeText("password123")
        app.buttons["כניסה"].tap()
    }
}
