import axios from 'axios';

import api from './api';
import type {
  ApiErrorBody,
  ApiErrorCode,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  GoogleLoginResponse,
  LoginBody,
  LoginResponse,
  MeResponse,
  RegisterBody,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  UpdateProfileResponse,
  VerifyResetCodeResponse,
} from '@/types';

export const authService = {
  async login(body: LoginBody): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', body);
    return data;
  },

  /**
   * Troca um id_token do Google por um JWT nosso. Cria a conta se ainda não
   * existir; se já existir um user com o mesmo email, faz o linking automático
   * (ver CONTRATO_LOGIN_GOOGLE.md, seção 4.1).
   */
  async googleLogin(idToken: string): Promise<GoogleLoginResponse> {
    const { data } = await api.post<GoogleLoginResponse>('/auth/google', { idToken });
    return data;
  },

  async register(body: RegisterBody): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', body);
    return data;
  },

  async getMe(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>('/auth/me');
    return data;
  },

  /**
   * Reenvia o email de verificação. Resposta é sempre genérica — não indica
   * se o email existe (antienumeration, RN23).
   */
  async resendVerification(email: string): Promise<ResendVerificationResponse> {
    const { data } = await api.post<ResendVerificationResponse>(
      '/auth/resend-verification',
      { email },
    );
    return data;
  },

  /**
   * Inicia a recuperação de senha enviando um código de 6 dígitos por email.
   * Ver CONTRATO_RECUPERACAO_SENHA.md, seção 4.1.
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const { data } = await api.post<ForgotPasswordResponse>('/auth/forgot-password', {
      email,
    });
    return data;
  },

  /**
   * Valida o código de 6 dígitos. Em caso de sucesso devolve um resetToken de
   * uso único (TTL 15min) exigido por /auth/reset-password.
   */
  async verifyResetCode(email: string, code: string): Promise<VerifyResetCodeResponse> {
    const { data } = await api.post<VerifyResetCodeResponse>('/auth/verify-reset-code', {
      email,
      code,
    });
    return data;
  },

  /** Troca a senha, dado um resetToken válido obtido em verifyResetCode. */
  async resetPassword(
    email: string,
    resetToken: string,
    novaSenha: string,
  ): Promise<ResetPasswordResponse> {
    const { data } = await api.post<ResetPasswordResponse>('/auth/reset-password', {
      email,
      resetToken,
      novaSenha,
    });
    return data;
  },

  /**
   * Altera a senha do usuário logado. Requer JWT (injetado pelo interceptor)
   * e a senha atual como prova de identidade (RN20).
   */
  async changePassword(
    senhaAtual: string,
    novaSenha: string,
  ): Promise<ChangePasswordResponse> {
    const { data } = await api.post<ChangePasswordResponse>('/auth/change-password', {
      senhaAtual,
      novaSenha,
    });
    return data;
  },

  /**
   * Atualiza o perfil do usuário logado. Só o nome é editável — email é
   * imutável por decisão de produto (RN19).
   */
  async updateProfile(nome: string): Promise<UpdateProfileResponse> {
    const { data } = await api.patch<UpdateProfileResponse>('/users/me', { nome });
    return data;
  },
};

/**
 * Retorna o `code` semântico de um erro da API, se houver.
 * Usado pelas telas para branching (ex.: detectar EMAIL_NOT_VERIFIED no login).
 */
export const getApiErrorCode = (err: unknown): ApiErrorCode | null => {
  if (!axios.isAxiosError<ApiErrorBody>(err)) return null;
  const code = err.response?.data?.code;
  return (code as ApiErrorCode) ?? null;
};
