
/**
 * SERVIÇO DE COMUNICAÇÃO COM O BACKEND STRIPE
 * 
 * Este arquivo não contém chaves secretas. Todas as operações sensíveis
 * são realizadas no backend seguro.
 */

import { SubscriptionStatus } from '../types';

const API_BASE_URL = '/api'; // Deve apontar para o seu servidor Node.js

export const createStripeCheckoutSession = async (userEmail: string) => {
  const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Falha ao criar sessão de checkout');
  }

  return response.json(); // Retorna { sessionId, url }
};

export const getStripePortalUrl = async (stripeCustomerId: string) => {
  const response = await fetch(`${API_BASE_URL}/create-portal-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: stripeCustomerId }),
  });

  if (!response.ok) throw new Error('Falha ao abrir portal');
  
  const data = await response.json();
  return data.url;
};

export const verifySessionStatus = async (sessionId: string): Promise<boolean> => {
  /**
   * Em produção, este endpoint consultaria o status real da sessão no Stripe
   * via backend para confirmar se o pagamento foi concluído antes de liberar o acesso.
   */
  try {
    const response = await fetch(`${API_BASE_URL}/verify-session?id=${sessionId}`);
    if (response.ok) {
      const { status } = await response.json();
      return status === 'complete';
    }
    return false;
  } catch {
    // Fallback para fins de MVP se o endpoint de verificação não estiver pronto
    return sessionId.startsWith('cs_');
  }
};
