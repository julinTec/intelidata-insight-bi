

## Plano: Configurar Admin para conta criada

A conta `juliocezarestudos35@gmail.com` (id: `40ec3a4d-7c3a-4c8a-92b0-b2af75f6bc4f`) já existe e está logada. Os dados do banco mostram que ela ainda não tem role admin e está com `is_paid = false`, `subscription_status = 'trial'`.

### Ações (apenas dados, sem alteração de código)

**1. Inserir role admin na tabela `user_roles`**
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('40ec3a4d-7c3a-4c8a-92b0-b2af75f6bc4f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**2. Atualizar perfil para admin com acesso total**
```sql
UPDATE profiles
SET is_paid = true,
    subscription_status = 'admin',
    paid_until = '2099-12-31T23:59:59Z'
WHERE id = '40ec3a4d-7c3a-4c8a-92b0-b2af75f6bc4f';
```

Após isso, basta recarregar a página para o sistema reconhecer o admin (sem banner de trial, sem overlay de pagamento, com acesso ao painel Admin).

