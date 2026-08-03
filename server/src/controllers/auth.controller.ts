import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
} from '../utils/cookies.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  ApiResponse.send(res, 201, 'Account created successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  ApiResponse.send(res, 200, 'Logged in successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(refreshToken);
  clearRefreshTokenCookie(res);
  ApiResponse.send(res, 200, 'Logged out successfully', null);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const result = await authService.refreshUserSession(refreshToken);
  setRefreshTokenCookie(res, result.refreshToken);
  ApiResponse.send(res, 200, 'Tokens refreshed successfully', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.send(res, 200, 'Current user', { user: req.user });
});
