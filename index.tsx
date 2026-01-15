import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Elemento root não encontrado no DOM. Verifique o seu index.html.");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro fatal durante a inicialização do React:", error);
    // Fallback caso o erro ocorra dentro do ciclo do React
    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background: black; height: 100vh; text-align: center; font-family: sans-serif;">
        <h2 style="color: #5C0A0A;">Falha Crítica</h2>
        <p>A aplicação encontrou um erro ao montar os componentes.</p>
        <pre style="font-size: 10px; background: #111; padding: 10px; border-radius: 8px; overflow: auto; max-width: 100%;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}