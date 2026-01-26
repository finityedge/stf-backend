export interface JwtPayload {
    id: string;
    email: string;
    role: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    phone: string;
    password: string;
    consentVersion: string;
    ipAddress: string;
}
