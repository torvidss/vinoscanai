import express, { RequestHandler } from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const app = express();

// Inicialização do Stripe com a chave secreta lida de STRIPE_SECRET_KEY
// Fix: Updated apiVersion to match the expected version '2025-12-15.clover' as per TypeScript error
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover', // Versão estável do Stripe
});

// Middleware para processar JSON
// Fix: Cast express.json() to RequestHandler to resolve type mismatch with app.use
app.use(express.json() as RequestHandler);

// Endpoint de Webhook (o corpo bruto é necessário para a validação da assinatura do Stripe)
// Nota: Em um servidor real, este endpoint deve vir antes do express.json() se usar o middleware global
// Fix: Cast express.raw to RequestHandler to resolve overload resolution issue in app.post
app.post('/api/webhook', express.raw({ type: 'application/json' }) as RequestHandler, async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret || '');
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object as any;

  switch (event.type) {
    case 'invoice.payment_succeeded':
      console.log(`[Stripe Webhook] Pagamento de R$ 29,90 aprovado: ${data.customer_email}`);
      break;
    case 'invoice.payment_failed':
      console.log(`[Stripe Webhook] Falha no pagamento: ${data.customer_email}`);
      break;
    case 'customer.subscription.deleted':
      console.log(`[Stripe Webhook] Assinatura cancelada para: ${data.customer}`);
      break;
  }

  res.json({ received: true });
});

const DOMAIN = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * POST /api/create-checkout-session
 * Cria uma sessão de checkout para o plano 'VinoScan AI PRO'
 * Valor: R$ 29,90 | Recorrência: Mensal
 */
app.post('/api/create-checkout-session', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'O email do usuário é obrigatório para iniciar o checkout.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'VinoScan AI PRO',
              description: 'Scans ilimitados, harmonizações avançadas e acesso prioritário ao Sommelier AI.',
              images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800'],
            },
            unit_amount: 2990, // R$ 29,90 em centavos (2990 / 100)
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${DOMAIN}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/subscription`,
    });

    // Retorna o ID da sessão e a URL para o frontend redirecionar o usuário
    res.json({ 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error: any) {
    console.error('[Stripe Error] Falha ao criar sessão de checkout:', error.message);
    res.status(500).json({ error: 'Erro interno ao processar o checkout no Stripe.' });
  }
});

/**
 * GET /api/verify-session
 * Valida se uma sessão de checkout foi concluída com sucesso
 */
app.get('/api/verify-session', async (req, res) => {
  const { id } = req.query;
  
  if (!id) return res.status(400).json({ error: 'ID da sessão ausente.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(id as string);
    res.json({ status: session.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/create-portal-session
 * Cria um link para o Customer Portal do Stripe onde o usuário gerencia a assinatura
 */
app.post('/api/create-portal-session', async (req, res) => {
  const { customerId } = req.body;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: DOMAIN,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao acessar o portal do cliente.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor Backend VinoScan AI rodando na porta ${PORT}`);
  console.log(`Configurado para o plano PRO de R$ 29,90/mês.`);
});