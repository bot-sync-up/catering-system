// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Catering",
    defaultLocalization: "he",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(name: "CateringCore", targets: ["CateringCore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.9.0"),
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.2"),
        .package(url: "https://github.com/realm/realm-swift.git", from: "10.50.0"),
        .package(url: "https://github.com/evgenyneu/keychain-swift.git", from: "24.0.0"),
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.25.0"),
        .package(url: "https://github.com/getsentry/sentry-cocoa.git", from: "8.30.0"),
        .package(url: "https://github.com/danielgindi/Charts.git", from: "5.1.0"),
    ],
    targets: [
        .target(
            name: "CateringCore",
            dependencies: [
                .product(name: "Alamofire", package: "Alamofire"),
                .product(name: "SwiftyJSON", package: "SwiftyJSON"),
                .product(name: "RealmSwift", package: "realm-swift"),
                .product(name: "KeychainSwift", package: "keychain-swift"),
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCrashlytics", package: "firebase-ios-sdk"),
                .product(name: "Sentry", package: "sentry-cocoa"),
                .product(name: "DGCharts", package: "Charts"),
            ],
            path: "Catering"
        ),
        .testTarget(
            name: "CateringTests",
            dependencies: ["CateringCore"],
            path: "CateringTests"
        ),
    ]
)
