export interface AuthTokenProvider {
  getUserId(): string | null
  getAccessToken(): string | null
}
