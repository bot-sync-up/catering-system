import Foundation
import Alamofire
import Combine
import SwiftyJSON

enum APIError: Error, LocalizedError {
    case unauthorized
    case network(String)
    case decoding
    case server(Int, String)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "החיבור פג תוקף, יש להתחבר מחדש"
        case .network(let m): return "שגיאת רשת: \(m)"
        case .decoding: return "שגיאת פענוח נתונים"
        case .server(let code, let m): return "שגיאת שרת \(code): \(m)"
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    private let baseURL = URL(string: "https://api.catering.syncup.co.il/v1")!
    private let session: Session
    private var refreshing = false
    private var pendingRequests: [(Result<String, APIError>) -> Void] = []

    private init() {
        let configuration = URLSessionConfiguration.af.default
        configuration.timeoutIntervalForRequest = 30
        configuration.waitsForConnectivity = true
        let interceptor = AuthInterceptor()
        self.session = Session(configuration: configuration, interceptor: interceptor)
    }

    func request<T: Decodable>(
        _ path: String,
        method: HTTPMethod = .get,
        params: [String: Any]? = nil,
        as type: T.Type
    ) -> AnyPublisher<T, APIError> {
        let url = baseURL.appendingPathComponent(path)
        let encoding: ParameterEncoding = method == .get ? URLEncoding.default : JSONEncoding.default

        return session.request(url, method: method, parameters: params, encoding: encoding)
            .validate()
            .publishDecodable(type: T.self)
            .value()
            .mapError { err -> APIError in
                if let code = err.responseCode, code == 401 { return .unauthorized }
                return .network(err.localizedDescription)
            }
            .eraseToAnyPublisher()
    }

    func upload(_ path: String, data: Data, mime: String, field: String = "file") -> AnyPublisher<JSON, APIError> {
        let url = baseURL.appendingPathComponent(path)
        return Future { promise in
            self.session.upload(multipartFormData: { form in
                form.append(data, withName: field, fileName: "upload.bin", mimeType: mime)
            }, to: url)
            .validate()
            .responseData { resp in
                switch resp.result {
                case .success(let d):
                    promise(.success(JSON(d)))
                case .failure(let e):
                    promise(.failure(.network(e.localizedDescription)))
                }
            }
        }.eraseToAnyPublisher()
    }
}

final class AuthInterceptor: RequestInterceptor {
    private let tokenStore = KeychainTokenStore.shared

    func adapt(_ urlRequest: URLRequest, for session: Session, completion: @escaping (Result<URLRequest, Error>) -> Void) {
        var req = urlRequest
        if let token = tokenStore.accessToken {
            req.headers.add(.authorization(bearerToken: token))
        }
        req.headers.add(name: "Accept-Language", value: "he-IL")
        req.headers.add(name: "X-Client", value: "ios")
        completion(.success(req))
    }

    func retry(_ request: Request, for session: Session, dueTo error: Error, completion: @escaping (RetryResult) -> Void) {
        guard let response = request.task?.response as? HTTPURLResponse, response.statusCode == 401 else {
            completion(.doNotRetry); return
        }
        refreshTokenAndRetry(completion: completion)
    }

    private func refreshTokenAndRetry(completion: @escaping (RetryResult) -> Void) {
        guard let refresh = tokenStore.refreshToken else {
            completion(.doNotRetry); return
        }
        let url = URL(string: "https://api.catering.syncup.co.il/v1/auth/refresh")!
        AF.request(url, method: .post, parameters: ["refresh_token": refresh], encoding: JSONEncoding.default)
            .validate()
            .responseDecodable(of: TokenPair.self) { resp in
                switch resp.result {
                case .success(let pair):
                    KeychainTokenStore.shared.save(pair: pair)
                    completion(.retry)
                case .failure:
                    KeychainTokenStore.shared.clear()
                    completion(.doNotRetryWithError(APIError.unauthorized))
                }
            }
    }
}

struct TokenPair: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}
