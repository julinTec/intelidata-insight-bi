

## Plano: Trial de 24h + Controle Manual de Pagamento + Admin Aprimorado

### 1. Migration SQL

Adicionar campos de subscription na tabela `profiles` (aproveitando a estrutura existente):

```sql
ALTER TABLE public.profiles ADD COLUMN is_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN plan_type text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN trial_expires_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN paid_until timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN payment_notes text DEFAULT NULL;
```

Atualizar o trigger `handle_new_user()` para preencher `trial_expires_at = NOW() + interval '24 hours'` automaticamente.

Atualizar perfis existentes com `trial_expires_at = created_at + interval '24 hours'`.

Inserir role admin para `julio.cezar@redebloom.com.br` (se ainda nao existir).

**Nota**: `is_admin` nao sera adicionado em profiles pois ja existe na tabela `user_roles`.

### 2. Hook `useSubscription`

Novo hook `src/hooks/useSubscription.ts`:
- Busca `profiles` do usuario logado (is_paid, trial_expires_at, paid_until, subscription_status)
- Usa `useRole` para verificar admin
- Calcula e expoe:
  - `hasAccess: boolean` - acesso liberado?
  - `isTrialing: boolean` - em trial?
  - `trialExpired: boolean`
  - `hoursRemaining: number`
  - `isPaid: boolean`
  - `isAdmin: boolean`

Logica de acesso:
```
if (isAdmin) → hasAccess = true
if (is_paid && paid_until > now) → hasAccess = true
if (!is_paid && trial_expires_at > now) → hasAccess = true (isTrialing)
else → hasAccess = false
```

### 3. Constante de configuracao

Criar `src/config/constants.ts`:
```typescript
export const PAYMENT_URL = "https://buy.stripe.com/cNibIU69z8jO6kf7jX1gs00";
export const SUPPORT_URL = "mailto:suporte@intelidata.com"; // ou WhatsApp
export const PLAN_PRICE = "R$29,90/mês";
```

### 4. Componente `TrialBanner`

`src/components/ui/TrialBanner.tsx`:
- Banner discreto no topo: "Seu teste gratis termina em X horas"
- Cor amarela quando < 6h restantes, vermelha quando < 1h
- Botao "Assinar agora" no banner
- Nao aparece para admins ou usuarios pagos

### 5. Componente `UpgradeOverlay`

`src/components/ui/UpgradeOverlay.tsx`:
- Overlay fullscreen elegante quando trial expirado
- Titulo: "Continue usando o InteliData"
- Texto descritivo, preco em destaque R$29,90/mes
- Botao principal abre `PAYMENT_URL` em nova aba
- Botao secundario "Falar com suporte"

### 6. Integrar no `AppLayout`

Modificar `src/components/layout/AppLayout.tsx`:
- Importar `useSubscription`
- Se `isTrialing` → renderizar `TrialBanner` acima do conteudo
- Se `!hasAccess` → renderizar `UpgradeOverlay` bloqueando o conteudo
- Admins e pagos passam direto

### 7. Admin aprimorado

Reescrever `src/pages/Admin.tsx` com:
- Tabela completa com colunas: nome, email, cadastro, trial_expires_at, is_paid, subscription_status, plan_type, paid_until
- Acoes por usuario: marcar/desmarcar pago, alterar status, definir plano, ajustar paid_until, excluir
- Dialog de edicao para cada usuario
- Filtros: trial ativo, trial expirado, pago, nao pago
- Busca por nome/email
- Exclusao com dupla confirmacao (via edge function `delete-account` existente ou nova logica admin)
- KPIs: total usuarios, pagos, em trial, trial expirado

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...` | Adicionar campos em profiles, atualizar trigger |
| `src/config/constants.ts` | **Criar** - PAYMENT_URL, SUPPORT_URL |
| `src/hooks/useSubscription.ts` | **Criar** - logica central de acesso |
| `src/components/ui/TrialBanner.tsx` | **Criar** - banner de trial |
| `src/components/ui/UpgradeOverlay.tsx` | **Criar** - tela de upgrade |
| `src/components/layout/AppLayout.tsx` | **Modificar** - integrar banner + overlay |
| `src/pages/Admin.tsx` | **Reescrever** - admin completo com gestao de pagamentos |

### Como alterar a URL de pagamento futuramente

Editar `src/config/constants.ts` → variavel `PAYMENT_URL`.

### Como definir um usuario como admin

O usuario `julio.cezar@redebloom.com.br` sera inserido como admin automaticamente na migration. Para adicionar outros admins, use o painel Admin existente (botao "Promover").

